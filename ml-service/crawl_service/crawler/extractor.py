"""
crawler/extractor.py — HTML → clean text extraction and MD5 hashing.

Uses trafilatura if available; falls back to BeautifulSoup (html.parser)
to isolate main content and strip navigation menus, ads, headers, footers.
"""

import hashlib
import logging
from typing import Optional

from bs4 import BeautifulSoup

from crawl_service.config import cfg

logger = logging.getLogger(__name__)

HAS_TRAFILATURA = False
try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    logger.info("trafilatura not found — using BeautifulSoup html.parser for extraction")


def extract_text(html: str, url: str = "") -> tuple[str, Optional[str]]:
    """
    Extract clean main-content text and the page title from raw HTML.

    Returns (text, title).
    """
    if not html:
        return "", None

    title: Optional[str] = None

    # --- Title extraction (BeautifulSoup — html.parser) ---------------------- #
    try:
        soup = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            title = title_tag.string.strip()[:512]
    except Exception as exc:
        logger.debug("Title extraction failed for %s: %s", url, exc)

    # --- Content extraction ------------------------------------------------- #
    text = ""
    if HAS_TRAFILATURA:
        try:
            extracted = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=True,
                no_fallback=False,
                favor_recall=True,
            )
            if extracted:
                text = extracted.strip()
        except Exception as exc:
            logger.warning("trafilatura extraction failed for %s: %s", url, exc)

    # Fallback to BeautifulSoup clean text extraction if trafilatura absent or returned empty
    if not text:
        try:
            soup = BeautifulSoup(html, "html.parser")
            # Decompose boilerplate elements
            for el in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
                el.decompose()
            text = soup.get_text(separator=" ", strip=True)
        except Exception as exc:
            logger.warning("BS4 extraction failed for %s: %s", url, exc)

    return text, title


def is_content_sufficient(text: str) -> bool:
    """Return True if text length >= MIN_TEXT_LENGTH."""
    return len(text) >= cfg.MIN_TEXT_LENGTH


def compute_hash(text: str) -> str:
    """Compute MD5 hex digest of clean text."""
    return hashlib.md5(text.encode("utf-8"), usedforsecurity=False).hexdigest()


def content_changed(new_text: str, stored_hash: Optional[str]) -> bool:
    """Return True if text hash differs from stored hash."""
    if stored_hash is None:
        return True
    return compute_hash(new_text) != stored_hash
