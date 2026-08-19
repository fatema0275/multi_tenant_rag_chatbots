"""
branding/extractor.py — Extraction of website brand color & favicon logo.

Priority order for theme_color:
1. CSS custom properties (--primary, --brand, --accent, --theme) in <style> or inline style,
   plus background-color on <header> / <nav> in HTML or same-domain CSS stylesheets.
2. Favicon dominant color using ColorThief (PNG/JPG) or SVG fill/stroke attribute.
3. Fallback default: '#22C55E'.

For logo_url:
Stores the resolved absolute favicon URL as-is (or None if unavailable).
"""

import io
import re
import logging
from typing import Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

try:
    from colorthief import ColorThief
except ImportError:
    ColorThief = None

logger = logging.getLogger(__name__)

HEX_COLOR_RE = re.compile(r'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
CSS_VAR_RE = re.compile(
    r'--(?:primary|brand|accent|theme)[a-zA-Z0-9_-]*\s*:\s*(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))',
    re.IGNORECASE
)
SVG_COLOR_RE = re.compile(
    r'(?:fill|stroke)\s*=\s*["\']?(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))["\']?',
    re.IGNORECASE
)


def extract_branding(domain: str) -> dict:
    """
    Extract theme_color and logo_url from a domain.
    Returns: { "theme_color": str, "logo_url": Optional[str] }
    """
    domain_clean = domain.strip().lower().replace("https://", "").replace("http://", "").split("/")[0]
    base_url = f"https://{domain_clean}"

    html = ""
    res = None
    try:
        res = requests.get(base_url, timeout=7, headers={"User-Agent": "SiteMind-BrandingExtractor/1.0"})
        res.raise_for_status()
        html = res.text
    except Exception as e:
        logger.warning("Failed HTTPS fetch for domain %s: %s. Trying HTTP...", domain_clean, e)
        try:
            base_url = f"http://{domain_clean}"
            res = requests.get(base_url, timeout=7, headers={"User-Agent": "SiteMind-BrandingExtractor/1.0"})
            res.raise_for_status()
            html = res.text
        except Exception as e2:
            logger.warning("Failed HTTP fetch for domain %s: %s", domain_clean, e2)

    soup = BeautifulSoup(html, "html.parser") if html else None

    # 1. Attempt CSS extraction
    theme_color = _extract_css_theme_color(soup, base_url, domain_clean) if soup else None

    # 2. Locate Favicon URL
    logo_url, favicon_bytes = _locate_and_fetch_favicon(soup, base_url, domain_clean)

    # 3. If no CSS color found, try extracting from favicon
    if not theme_color and favicon_bytes:
        theme_color = _extract_color_from_favicon(favicon_bytes, logo_url)

    # 4. Final fallback
    if not theme_color:
        theme_color = "#22C55E"

    logger.info("Extracted branding for domain '%s': theme_color=%s, logo_url=%s", domain_clean, theme_color, logo_url)

    return {
        "theme_color": theme_color,
        "logo_url": logo_url,
    }


def _extract_css_theme_color(soup: BeautifulSoup, base_url: str, domain: str) -> Optional[str]:
    """Inspect style tags, inline styles, header/nav background colors, and same-domain CSS stylesheets."""
    # Check <style> tags and inline style attributes for CSS custom properties
    for style_tag in soup.find_all("style"):
        if style_tag.string:
            match = CSS_VAR_RE.search(style_tag.string)
            if match:
                return _normalize_hex(match.group(1))

    for tag in soup.find_all(True, style=True):
        style_attr = tag.get("style", "")
        match = CSS_VAR_RE.search(style_attr)
        if match:
            return _normalize_hex(match.group(1))

    # Check background-color on <header> and <nav> elements in inline styles
    for element in soup.find_all(["header", "nav"]):
        style_attr = element.get("style", "")
        if "background" in style_attr:
            match = HEX_COLOR_RE.search(style_attr)
            if match:
                return _normalize_hex(match.group(0))

    # Check same-domain linked stylesheets
    for link_tag in soup.find_all("link", rel=lambda r: r and "stylesheet" in r):
        href = link_tag.get("href")
        if not href:
            continue
        full_css_url = urljoin(base_url, href)
        parsed_css = urlparse(full_css_url)
        if domain in parsed_css.netloc:
            try:
                css_res = requests.get(full_css_url, timeout=4, headers={"User-Agent": "SiteMind-BrandingExtractor/1.0"})
                if css_res.ok:
                    css_text = css_res.text
                    match = CSS_VAR_RE.search(css_text)
                    if match:
                        return _normalize_hex(match.group(1))
                    
                    # Search for header/nav background in CSS rules
                    header_nav_blocks = re.findall(r'(?:header|nav)[^{]*\{([^}]+)\}', css_text, re.IGNORECASE)
                    for block in header_nav_blocks:
                        if "background" in block.lower():
                            match = HEX_COLOR_RE.search(block)
                            if match:
                                return _normalize_hex(match.group(0))
            except Exception as css_err:
                logger.debug("Failed fetching CSS stylesheet %s: %s", full_css_url, css_err)

    return None


def _locate_and_fetch_favicon(soup: Optional[BeautifulSoup], base_url: str, domain: str) -> Tuple[Optional[str], Optional[bytes]]:
    """Locate favicon checking rel='icon', rel='shortcut icon', rel='apple-touch-icon', then /favicon.ico fallback."""
    candidate_urls = []

    if soup:
        # Check rel="icon", rel="shortcut icon", rel="apple-touch-icon" in priority order
        rel_priority = ["icon", "shortcut icon", "apple-touch-icon"]
        for target_rel in rel_priority:
            for link in soup.find_all("link", rel=True):
                rels = [r.lower() for r in (link.get("rel") if isinstance(link.get("rel"), list) else [link.get("rel")])]
                if target_rel in rels and link.get("href"):
                    candidate_urls.append(urljoin(base_url, link.get("href")))

    # Fallback to direct /favicon.ico
    candidate_urls.append(urljoin(base_url, "/favicon.ico"))

    for fav_url in candidate_urls:
        try:
            res = requests.get(fav_url, timeout=4, headers={"User-Agent": "SiteMind-BrandingExtractor/1.0"})
            if res.ok and res.content and len(res.content) > 50:
                return fav_url, res.content
        except Exception as e:
            logger.debug("Favicon fetch failed for %s: %s", fav_url, e)

    return None, None


def _extract_color_from_favicon(fav_bytes: bytes, fav_url: Optional[str]) -> Optional[str]:
    """Extract dominant hex color from SVG or PNG/JPG favicon bytes."""
    # Check if SVG
    if fav_url and fav_url.lower().endswith(".svg") or b"<svg" in fav_bytes[:500].lower():
        try:
            svg_text = fav_bytes.decode("utf-8", errors="ignore")
            match = SVG_COLOR_RE.search(svg_text)
            if match:
                return _normalize_hex(match.group(1))
            # Fallback hex search in SVG
            match = HEX_COLOR_RE.search(svg_text)
            if match:
                return _normalize_hex(match.group(0))
        except Exception as svg_err:
            logger.debug("SVG color extraction error: %s", svg_err)

    # PNG / JPG dominant color extraction via ColorThief
    if ColorThief:
        try:
            cf = ColorThief(io.BytesIO(fav_bytes))
            rgb = cf.get_color(quality=1)
            if rgb:
                return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
        except Exception as ct_err:
            logger.debug("ColorThief extraction failed: %s", ct_err)

    return None


def _normalize_hex(hex_str: str) -> str:
    """Normalize hex string to standard #RRGGBB uppercase format."""
    cleaned = hex_str.strip().lstrip('#')
    if len(cleaned) == 3:
        cleaned = ''.join([c * 2 for c in cleaned])
    return f"#{cleaned[:6].upper()}"
