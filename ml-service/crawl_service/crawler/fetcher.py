"""
crawler/fetcher.py — HTTP fetching with Playwright escalation.

Two-stage fetch strategy:
  1. Plain requests.get() — fast, no browser overhead.
  2. Playwright (headless Chromium) — escalated when stage-1 yields
     fewer than cfg.MIN_TEXT_LENGTH characters of extracted text.

Change-detection (for incremental crawls):
  - _head_check() — lightweight HEAD request that returns the ETag
    and Last-Modified headers.  If both match stored values, the
    caller can skip the full fetch immediately.
  - Full fetch always follows for pages where headers are absent or differ.
  - After extraction, the caller compares MD5 hashes as a second gate.

Politeness:
  - Exponential backoff (up to cfg.RETRY_MAX_ATTEMPTS) on 403/429.
  - Per-request timeout of cfg.PAGE_TIMEOUT seconds.
  - No parallel requests to the same domain (enforced in crawl_task.py
    via a per-domain threading.Lock).

IMPORTANT: Playwright is only used inside Celery task workers, never
inside a Flask request handler.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

import requests
from requests import Response

from crawl_service.config import cfg

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Data classes                                                                 #
# --------------------------------------------------------------------------- #

@dataclass
class FetchResult:
    """The outcome of fetching a single page."""
    url: str
    html: str = ""
    content: bytes = field(default_factory=bytes)
    content_type: str = ""
    status_code: int = 0
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    rendered_with_playwright: bool = False
    # None = success, non-None = failure reason string
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.error is None



@dataclass
class HeadResult:
    """Lightweight result of a HEAD request used for change detection."""
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    status_code: int = 0
    reachable: bool = True


# --------------------------------------------------------------------------- #
# Public helpers                                                               #
# --------------------------------------------------------------------------- #

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def build_session() -> requests.Session:
    """Return a requests.Session with the crawler User-Agent pre-configured."""
    session = requests.Session()
    session.headers.update({"User-Agent": cfg.USER_AGENT})
    session.verify = False
    return session


def head_check(url: str, session: requests.Session) -> HeadResult:
    """
    Send a HEAD request to `url` and return cache-validation headers.

    Used at the start of an incremental crawl to decide whether a full
    fetch is necessary.  Returns HeadResult.reachable=False if the
    request errors out (caller should proceed to full fetch in that case).
    """
    try:
        resp = session.head(
            url,
            timeout=cfg.PAGE_TIMEOUT,
            allow_redirects=True,
        )
        return HeadResult(
            etag=resp.headers.get("ETag"),
            last_modified=resp.headers.get("Last-Modified"),
            status_code=resp.status_code,
            reachable=True,
        )
    except requests.RequestException as exc:
        logger.debug("HEAD request failed for %s: %s", url, exc)
        return HeadResult(reachable=False)


def fetch_page(url: str, session: requests.Session) -> FetchResult:
    """
    Fetch `url` and return a FetchResult.

    Handles:
      - 403/429 → exponential backoff, up to cfg.RETRY_MAX_ATTEMPTS
      - Timeout   → error='timeout'
      - Other 4xx/5xx → error=f'http_{status_code}'
    """
    attempt = 0
    delay = cfg.RETRY_BACKOFF_BASE

    while attempt <= cfg.RETRY_MAX_ATTEMPTS:
        try:
            resp: Response = session.get(
                url,
                timeout=cfg.PAGE_TIMEOUT,
                allow_redirects=True,
            )
        except requests.Timeout:
            logger.warning("Timeout fetching %s (attempt %d)", url, attempt + 1)
            return FetchResult(url=url, error="timeout")
        except requests.RequestException as exc:
            logger.warning("Request error fetching %s: %s", url, exc)
            return FetchResult(url=url, error=f"request_error: {exc}")

        if resp.status_code in (403, 429) and attempt < cfg.RETRY_MAX_ATTEMPTS:
            logger.info(
                "HTTP %d for %s — backing off %.1fs (attempt %d/%d)",
                resp.status_code, url, delay, attempt + 1, cfg.RETRY_MAX_ATTEMPTS
            )
            time.sleep(delay)
            delay *= 2
            attempt += 1
            continue

        if not resp.ok:
            logger.info("HTTP %d for %s — logging as failed", resp.status_code, url)
            return FetchResult(
                url=url,
                status_code=resp.status_code,
                error=f"http_{resp.status_code}",
            )

        ct = resp.headers.get("Content-Type", "")
        is_binary = any(b in ct.lower() for b in ["pdf", "image/"])
        return FetchResult(
            url=url,
            html="" if is_binary else resp.text,
            content=resp.content,
            content_type=ct,
            status_code=resp.status_code,
            etag=resp.headers.get("ETag"),
            last_modified=resp.headers.get("Last-Modified"),
        )


    # Exhausted retries
    return FetchResult(url=url, error=f"max_retries_exceeded")


def fetch_page_with_playwright(url: str) -> FetchResult:
    """
    Render `url` with Playwright headless Chromium and return the page HTML.

    Only called when plain requests yielded insufficient text content.
    Must only be invoked inside a Celery task (never in a Flask handler).

    Returns FetchResult with error set if Playwright fails.
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        logger.error("Playwright is not installed. Run: playwright install chromium")
        return FetchResult(url=url, error="playwright_not_installed")

    logger.info("Escalating to Playwright for %s", url)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=cfg.USER_AGENT,
                ignore_https_errors=True,
            )
            page = context.new_page()

            try:
                resp = page.goto(url, timeout=cfg.PAGE_TIMEOUT * 1000, wait_until="domcontentloaded")
                try:
                    page.wait_for_timeout(1500)
                except Exception:
                    pass
                html = page.content()

                # Check if server returned 404 on direct path request for an SPA route on static host
                status_code = resp.status if resp else 200
                is_spa_404 = status_code == 404 or "404" in (page.title() or "")
                if is_spa_404:
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    base_url = f"{parsed.scheme}://{parsed.netloc}/"
                    path = parsed.path
                    if path and path != "/":
                        logger.info("Direct route returned 404 for %s — attempting client-side navigation via %s", url, base_url)
                        page.goto(base_url, timeout=cfg.PAGE_TIMEOUT * 1000, wait_until="domcontentloaded")
                        try:
                            page.wait_for_timeout(1000)
                        except Exception:
                            pass
                        locator = page.locator(f'a[href="{path}"], a[href="{path}/"], a[href="{url}"], a[href="{path.lstrip("/")}"]')
                        if locator.count() > 0:
                            locator.first.click()
                        else:
                            page.evaluate(f"window.history.pushState(null, '', '{path}'); window.dispatchEvent(new PopStateEvent('popstate'));")
                        try:
                            page.wait_for_load_state("networkidle", timeout=3000)
                        except Exception:
                            pass
                        try:
                            page.wait_for_timeout(2000)
                        except Exception:
                            pass
                        html = page.content()
            except PWTimeout:
                logger.warning("Playwright timeout for %s", url)
                return FetchResult(url=url, error="timeout")
            finally:
                context.close()
                browser.close()

        return FetchResult(
            url=url,
            html=html,
            status_code=200,
            rendered_with_playwright=True,
        )

    except Exception as exc:
        logger.error("Playwright error for %s: %s", url, exc)
        return FetchResult(url=url, error=f"playwright_error: {exc}")
