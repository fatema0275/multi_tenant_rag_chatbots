"""
crawler/discovery.py — URL discovery for a crawl job.

Strategy (tried in order):
  1. Fetch /sitemap_index.xml — parse all nested <sitemap> locs,
     then fetch each child sitemap and collect <url><loc> entries.
  2. Fetch /sitemap.xml — collect <url><loc> entries.
  3. If neither sitemap returns any URLs, fall back to multithreaded BFS link
     traversal starting at the homepage (same-domain only).

All discovered URLs are normalised (scheme + netloc + path + query),
deduplicated, and capped at cfg.MAX_PAGES.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse, urlunparse
from typing import Optional

import requests
from bs4 import BeautifulSoup

try:
    from lxml import etree as ET
except ImportError:
    import xml.etree.ElementTree as ET  # stdlib fallback

from crawl_service.config import cfg
from crawl_service.crawler.robots import is_allowed

logger = logging.getLogger(__name__)

# Common tracking / session query params to strip before dedup
_STRIP_PARAMS = frozenset({
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "ref", "source",
})


# --------------------------------------------------------------------------- #
# Public API                                                                   #
# --------------------------------------------------------------------------- #

def discover_urls(domain: str, scheme: str = "https", job_id: Optional[int] = None) -> list[str]:
    """
    Discover all crawlable URLs for a domain.

    Returns a deduplicated, robots-filtered list of absolute URLs,
    capped at cfg.MAX_PAGES.
    """
    base_url = f"{scheme}://{domain}"
    headers = {"User-Agent": cfg.USER_AGENT}

    urls = _try_sitemaps(base_url, domain, scheme, headers)

    if not urls:
        logger.info("No sitemap URLs found for %s — falling back to multithreaded BFS", domain)
        urls = _bfs_discover(base_url, domain, scheme, headers, job_id=job_id)

    logger.info("Discovered %d URL(s) for %s", len(urls), domain)
    return urls[: cfg.MAX_PAGES]


# --------------------------------------------------------------------------- #
# Sitemap parsing                                                              #
# --------------------------------------------------------------------------- #

def _try_sitemaps(
    base_url: str, domain: str, scheme: str, headers: dict
) -> list[str]:
    """
    Try each path in cfg.SITEMAP_PATHS in order.
    Returns a flat, deduplicated list of page URLs on first success.
    """
    for path in cfg.SITEMAP_PATHS:
        url = base_url.rstrip("/") + path
        urls = _fetch_sitemap(url, domain, scheme, headers, is_index=path.endswith("_index.xml"))
        if urls:
            return urls
    return []


def _fetch_sitemap(
    sitemap_url: str,
    domain: str,
    scheme: str,
    headers: dict,
    is_index: bool = False,
) -> list[str]:
    """
    Fetch and parse a sitemap (or sitemap index) XML.
    Returns a list of page URLs (empty list on failure).
    """
    try:
        resp = requests.get(
            sitemap_url,
            headers=headers,
            timeout=4,
            allow_redirects=True,
        )
        if resp.status_code != 200:
            logger.debug("Sitemap %s returned HTTP %d", sitemap_url, resp.status_code)
            return []
    except requests.RequestException as exc:
        logger.debug("Could not fetch sitemap %s: %s", sitemap_url, exc)
        return []

    try:
        root = ET.fromstring(resp.content)
    except ET.ParseError as exc:
        logger.warning("Failed to parse sitemap XML from %s: %s", sitemap_url, exc)
        return []

    tag = root.tag

    if "sitemapindex" in tag:
        child_urls: list[str] = []
        for loc_el in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
            child_sitemap_url = (loc_el.text or "").strip()
            if child_sitemap_url:
                child_urls.extend(
                    _fetch_sitemap(child_sitemap_url, domain, scheme, headers)
                )
        return _filter_and_dedup(child_urls, domain, scheme)

    urls = []
    for loc_el in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
        loc = (loc_el.text or "").strip()
        if loc:
            urls.append(loc)

    return _filter_and_dedup(urls, domain, scheme)


# --------------------------------------------------------------------------- #
# Multithreaded BFS link traversal                                             #
# --------------------------------------------------------------------------- #

def _bfs_discover(
    base_url: str,
    domain: str,
    scheme: str,
    headers: dict,
    job_id: Optional[int] = None,
) -> list[str]:
    """
    Multithreaded level-by-level BFS link traversal starting at base_url.

    Respects cfg.MAX_DEPTH and cfg.MAX_PAGES.
    Follows only same-domain links.
    Checks robots.txt before adding a URL to queue.
    """
    from crawl_service.db.crawl_jobs import increment_job_counter

    visited: set[str] = set()
    found: list[str] = []

    first_norm = _normalise(base_url)
    if not first_norm:
        return []

    current_level: set[str] = {first_norm}
    depth = 0

    while current_level and len(found) < cfg.MAX_PAGES and depth <= cfg.MAX_DEPTH:
        candidates = [
            u for u in current_level
            if u not in visited and is_allowed(u, domain, scheme)
        ]

        for u in candidates:
            visited.add(u)

        if not candidates:
            break

        next_level: set[str] = set()

        def _fetch_url(u: str):
            try:
                resp = requests.get(u, headers=headers, timeout=5, allow_redirects=True)
                if resp.status_code == 200 and "text/html" in resp.headers.get("Content-Type", ""):
                    if job_id:
                        try:
                            increment_job_counter(job_id, "pages_found", 1)
                        except Exception:
                            pass
                    return u, resp.text
            except Exception:
                pass
            return u, None

        level_new_found = 0
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(_fetch_url, u) for u in candidates]
            for fut in as_completed(futures):
                u, html = fut.result()
                if html:
                    found.append(u)
                    level_new_found += 1
                    if len(found) >= cfg.MAX_PAGES:
                        break
                    if depth < cfg.MAX_DEPTH:
                        try:
                            soup = BeautifulSoup(html, "html.parser")
                            for a_tag in soup.find_all("a", href=True):
                                href = a_tag["href"].strip()
                                abs_url = urljoin(u, href)
                                norm_child = _normalise(abs_url)
                                if norm_child and _same_domain(norm_child, domain) and norm_child not in visited:
                                    next_level.add(norm_child)
                        except Exception:
                            pass

        if job_id and level_new_found > 0:
            try:
                increment_job_counter(job_id, "pages_found", level_new_found)
            except Exception:
                pass

        current_level = next_level
        depth += 1

    return found[: cfg.MAX_PAGES]


# --------------------------------------------------------------------------- #
# URL utilities                                                                #
# --------------------------------------------------------------------------- #

def _normalise(url: str) -> Optional[str]:
    """
    Return a canonical form of `url` (lowercase scheme+host, strip fragment).
    Returns None for non-http(s) URLs.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        return None

    if parsed.scheme not in ("http", "https"):
        return None

    return urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        parsed.path or "/",
        parsed.params,
        parsed.query,
        "",  # no fragment
    ))


def _same_domain(url: str, domain: str) -> bool:
    """True if url's netloc matches the crawl domain (ignoring www prefix)."""
    netloc = urlparse(url).netloc.lower()
    clean_netloc = netloc.replace("www.", "")
    clean_domain = domain.replace("www.", "")
    return clean_netloc == clean_domain


def _filter_and_dedup(urls: list[str], domain: str, scheme: str) -> list[str]:
    """
    Filter a list of URLs to same-domain, robots-allowed, normalised,
    deduplicated entries.
    """
    seen: set[str] = set()
    result: list[str] = []
    for raw in urls:
        norm = _normalise(raw)
        if not norm:
            continue
        if not _same_domain(norm, domain):
            continue
        if norm in seen:
            continue
        if not is_allowed(norm, domain, scheme):
            continue
        seen.add(norm)
        result.append(norm)
    return result
