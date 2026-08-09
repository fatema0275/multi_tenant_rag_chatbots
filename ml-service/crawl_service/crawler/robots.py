"""
crawler/robots.py — robots.txt fetching and compliance checking.

Design:
  - One RobotFileParser is created per domain per crawl job and cached.
  - We fetch robots.txt with requests.get (timeout=4s).
  - If robots.txt returns 404 or an HTML page, we set allow_all=True
    (permissive fallback per standard robot parser specs).
  - Crawl-delay directive is respected.
"""

import logging
from urllib.robotparser import RobotFileParser
import requests

from crawl_service.config import cfg

logger = logging.getLogger(__name__)

# Cache: domain → (RobotFileParser, crawl_delay_seconds)
_robots_cache: dict[str, tuple[RobotFileParser, float]] = {}


def _fetch_robots(domain: str, scheme: str = "https") -> tuple[RobotFileParser, float]:
    """
    Fetch and parse robots.txt for a domain with a 4s timeout.
    Guards against HTML 404/error pages masquerading as 200 plain text.
    """
    robots_url = f"{scheme}://{domain}/robots.txt"
    rp = RobotFileParser()
    rp.set_url(robots_url)

    try:
        resp = requests.get(
            robots_url,
            headers={"User-Agent": cfg.USER_AGENT},
            timeout=4,
            allow_redirects=True,
        )
        body = resp.text.strip()
        # Only parse if HTTP 200 AND content is not HTML garbage
        if resp.status_code == 200 and body and not body.lower().startswith(("<html", "<!doctype")):
            rp.parse(body.splitlines())
            logger.debug("Fetched and parsed robots.txt from %s", robots_url)
        else:
            # 404 or HTML page returned for /robots.txt → allow all
            rp.allow_all = True
            logger.info("robots.txt absent/invalid on %s — allowing all", robots_url)
    except Exception as exc:
        rp.allow_all = True
        logger.warning(
            "Could not fetch robots.txt from %s (%s) — allowing all",
            robots_url, exc
        )

    crawl_delay = rp.crawl_delay(cfg.USER_AGENT) or 0.0
    return rp, float(crawl_delay)


def get_robots(domain: str, scheme: str = "https") -> tuple[RobotFileParser, float]:
    """
    Return (RobotFileParser, crawl_delay) for the given domain.
    Cached per process.
    """
    cache_key = f"{scheme}://{domain}"
    if cache_key not in _robots_cache:
        _robots_cache[cache_key] = _fetch_robots(domain, scheme)
    return _robots_cache[cache_key]


def is_allowed(url: str, domain: str, scheme: str = "https") -> bool:
    """
    Return True if the User-Agent is allowed to crawl `url` per robots.txt.
    """
    rp, _ = get_robots(domain, scheme)
    allowed = rp.can_fetch(cfg.USER_AGENT, url)
    if not allowed:
        logger.info("robots.txt disallows crawling: %s", url)
    return allowed


def get_crawl_delay(domain: str, scheme: str = "https") -> float:
    """
    Return the Crawl-delay specified in robots.txt, or cfg.REQUEST_DELAY.
    """
    _, robots_delay = get_robots(domain, scheme)
    return max(robots_delay, cfg.REQUEST_DELAY)


def clear_cache() -> None:
    """Clear the robots.txt cache."""
    _robots_cache.clear()
