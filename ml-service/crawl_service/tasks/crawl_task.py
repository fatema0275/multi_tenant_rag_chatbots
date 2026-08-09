"""
tasks/crawl_task.py — Celery task that orchestrates a full crawl job.

This is the heart of Module 2.  It is the only place that:
  - Runs Playwright (never inside a Flask handler)
  - Manages the per-domain rate-limit lock
  - Coordinates the first-crawl vs incremental-crawl logic
  - Updates crawl_jobs counters as pages complete

Execution flow
--------------
1.  Mark crawl_job as running; determine crawl_type.
2.  Load existing pages from DB (for incremental runs).
3.  Discover all URLs via sitemap → BFS.
4.  For each URL (thread pool, ≤ cfg.MAX_WORKERS threads):
      a. Check robots.txt → skip if disallowed.
      b. Incremental only: HEAD request → compare ETag/Last-Modified.
         If unchanged (and we have a stored hash) → mark skipped, continue.
      c. Full GET fetch with backoff.
      d. Extract text; if < MIN_TEXT_LENGTH → escalate to Playwright.
      e. Compute MD5 hash; compare to stored hash.
         If unchanged → mark skipped (content confirmed same), continue.
      f. Upsert pages row with new content, set needs_embedding=True.
      g. Log outcome to crawl_logs.
      h. Increment appropriate crawl_jobs counter.
5.  Mark URLs removed if they disappeared from this crawl.
6.  Mark crawl_job as completed (or failed on exception).

Politeness
----------
  - Domain-level threading.Lock prevents concurrent requests to the same host.
  - time.sleep(crawl_delay) after every page fetch.
  - Playwright is launched fresh per escalated page; no shared browser state.
"""

import logging
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
from typing import Optional

from crawl_service.celery_app import celery
from crawl_service.config import cfg
from crawl_service.crawler.discovery import discover_urls
from crawl_service.crawler.extractor import (
    compute_hash,
    content_changed,
    extract_text,
    is_content_sufficient,
)
from crawl_service.crawler.fetcher import (
    FetchResult,
    build_session,
    fetch_page,
    fetch_page_with_playwright,
    head_check,
)
from crawl_service.crawler.robots import get_crawl_delay, is_allowed
from crawl_service.db.crawl_jobs import (
    get_crawl_job,
    increment_job_counter,
    mark_job_completed,
    mark_job_failed,
    mark_job_running,
)
from crawl_service.db.crawl_logs import log_page_outcome
from crawl_service.db.pages import (
    bump_last_crawled,
    get_existing_pages,
    mark_pages_removed,
    upsert_page,
)

logger = logging.getLogger(__name__)

# Per-domain locks shared across threads within one worker process.
# Prevents concurrent requests to the same domain regardless of how many
# URLs from that domain appear in the crawl queue.
_domain_locks: dict[str, threading.Lock] = defaultdict(threading.Lock)
_domain_locks_guard = threading.Lock()


def _get_domain_lock(domain: str) -> threading.Lock:
    with _domain_locks_guard:
        return _domain_locks[domain]


# --------------------------------------------------------------------------- #
# Celery task definition                                                       #
# --------------------------------------------------------------------------- #

@celery.task(
    name="crawl_service.tasks.crawl_task.run_crawl",
    bind=True,
    max_retries=0,        # The task manages its own retries internally
    acks_late=True,       # Don't ack until the task finishes
    time_limit=7200,      # Hard 2-hour limit per job
    soft_time_limit=6900, # Soft limit triggers SoftTimeLimitExceeded
)
def run_crawl(self, job_id: int, website_id: int, domain: str) -> dict:
    """
    Main Celery task — orchestrates the entire crawl for one website.

    Parameters
    ----------
    job_id     : crawl_jobs.id
    website_id : websites.id
    domain     : e.g. 'example.com' (no scheme)
    """
    logger.info("=== Crawl job %d starting: website_id=%d domain=%s ===", job_id, website_id, domain)

    # ------------------------------------------------------------------ #
    # Step 1 — Determine crawl type and transition job to running         #
    # ------------------------------------------------------------------ #
    existing_pages = get_existing_pages(website_id)
    crawl_type = "incremental" if existing_pages else "first"

    mark_job_running(job_id, crawl_type)
    logger.info("Job %d: crawl_type=%s, existing_pages=%d", job_id, crawl_type, len(existing_pages))

    try:
        # ------------------------------------------------------------------ #
        # Step 2 — Discover URLs                                              #
        # ------------------------------------------------------------------ #
        scheme = "https"
        discovered_urls = discover_urls(domain, scheme, job_id=job_id)
        logger.info("Job %d: discovered %d URLs total", job_id, len(discovered_urls))

        if not discovered_urls:
            logger.warning("Job %d: no URLs discovered — marking completed", job_id)
            mark_job_completed(job_id)
            return {"job_id": job_id, "status": "completed", "pages_found": 0}

        # ------------------------------------------------------------------ #
        # Step 3 — Process pages in a thread pool                            #
        # ------------------------------------------------------------------ #
        live_urls: set[str] = set()

        with ThreadPoolExecutor(max_workers=cfg.MAX_WORKERS) as executor:
            futures = {
                executor.submit(
                    _process_page,
                    url=url,
                    job_id=job_id,
                    website_id=website_id,
                    domain=domain,
                    scheme=scheme,
                    crawl_type=crawl_type,
                    existing_pages=existing_pages,
                ): url
                for url in discovered_urls
            }

            for future in as_completed(futures):
                url = futures[future]
                try:
                    outcome = future.result()
                    if outcome in ("success", "skipped_unchanged", "duplicate"):
                        live_urls.add(url)
                except Exception as exc:
                    logger.error("Unhandled exception processing %s: %s", url, exc, exc_info=True)
                    log_page_outcome(job_id, url, "failed", str(exc))
                    increment_job_counter(job_id, "pages_failed")

        # ------------------------------------------------------------------ #
        # Step 4 — Mark removed pages                                         #
        # ------------------------------------------------------------------ #
        removed = mark_pages_removed(website_id, live_urls)
        for removed_url in removed:
            log_page_outcome(job_id, removed_url, "removed", "Not found in current crawl")

        # ------------------------------------------------------------------ #
        # Step 5 — Complete                                                   #
        # ------------------------------------------------------------------ #
        mark_job_completed(job_id)
        logger.info("=== Crawl job %d completed ===", job_id)

        return {
            "job_id": job_id,
            "status": "completed",
            "pages_found": len(discovered_urls),
        }

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Crawl job %d failed: %s", job_id, error_msg, exc_info=True)
        mark_job_failed(job_id, error_msg)
        raise   # Re-raise so Celery records the task as FAILED


# --------------------------------------------------------------------------- #
# Per-page processing (runs inside thread pool)                               #
# --------------------------------------------------------------------------- #

def _process_page(
    *,
    url: str,
    job_id: int,
    website_id: int,
    domain: str,
    scheme: str,
    crawl_type: str,
    existing_pages: dict,
) -> str:
    """
    Process one URL: check robots → optional HEAD → fetch → extract → persist.

    Returns a status string: 'success' | 'skipped_unchanged' | 'failed' |
    'robots_disallowed' | 'timeout' | 'duplicate'.
    """
    # ------------------------------------------------------------------ #
    # 1. robots.txt gate                                                   #
    # ------------------------------------------------------------------ #
    if not is_allowed(url, domain, scheme):
        log_page_outcome(job_id, url, "robots_disallowed", "Disallowed by robots.txt")
        increment_job_counter(job_id, "pages_skipped")
        return "robots_disallowed"

    known = existing_pages.get(url)
    session = build_session()
    crawl_delay = get_crawl_delay(domain, scheme)

    # Acquire domain lock — ensures only one thread hits this domain at a time
    domain_lock = _get_domain_lock(domain)
    with domain_lock:

        # ------------------------------------------------------------------ #
        # 2. Incremental: lightweight HEAD-based change detection             #
        # ------------------------------------------------------------------ #
        if crawl_type == "incremental" and known:
            head = head_check(url, session)

            if head.reachable and _headers_unchanged(head, known):
                # Headers suggest content hasn't changed — skip full fetch.
                logger.debug("HEAD unchanged for %s — skipping", url)
                bump_last_crawled(url, website_id)
                log_page_outcome(job_id, url, "skipped_unchanged", "ETag/Last-Modified unchanged")
                increment_job_counter(job_id, "pages_skipped")
                time.sleep(crawl_delay)
                return "skipped_unchanged"

        # ------------------------------------------------------------------ #
        # 3. Full HTTP fetch                                                   #
        # ------------------------------------------------------------------ #
        result: FetchResult = fetch_page(url, session)

        # Rate-limit sleep inside the lock (one domain slot)
        time.sleep(crawl_delay)

    # ------------------------------------------------------------------ #
    # 4. Handle fetch failures                                             #
    # ------------------------------------------------------------------ #
    if not result.ok:
        status = "timeout" if result.error == "timeout" else "failed"
        log_page_outcome(job_id, url, status, result.error)
        increment_job_counter(job_id, "pages_failed")
        return status

    # ------------------------------------------------------------------ #
    # 5. Extract content                                                   #
    # ------------------------------------------------------------------ #
    text, title = extract_text(result.html, url=url)

    # ------------------------------------------------------------------ #
    # 6. Playwright escalation (outside domain lock — JS render is slow)   #
    # ------------------------------------------------------------------ #
    # ------------------------------------------------------------------ #
    # 6. Playwright escalation (optional JS rendering fallback)          #
    # ------------------------------------------------------------------ #
    if not is_content_sufficient(text):
        try:
            pw_result = fetch_page_with_playwright(url)
            if pw_result.ok and pw_result.html:
                text_pw, title_pw = extract_text(pw_result.html, url=url)
                if text_pw:
                    text = text_pw
                if title_pw:
                    title = title_pw
        except Exception as pw_err:
            logger.debug("Playwright escalation skipped: %s", pw_err)

    # ------------------------------------------------------------------ #
    # 7. MD5 hash comparison — second gate for incremental crawls          #
    # ------------------------------------------------------------------ #
    new_hash = compute_hash(text) if text else None

    if crawl_type == "incremental" and known and not content_changed(text, known.get("content_hash")):
        bump_last_crawled(url, website_id)
        log_page_outcome(job_id, url, "skipped_unchanged", "Content hash unchanged after extraction")
        increment_job_counter(job_id, "pages_skipped")
        return "skipped_unchanged"

    # ------------------------------------------------------------------ #
    # 8. Persist to pages table                                            #
    # ------------------------------------------------------------------ #
    if text.strip() and new_hash:
        upsert_page(
            website_id=website_id,
            url=url,
            title=title,
            raw_text=text,
            content_hash=new_hash,
            http_etag=result.etag,
            http_last_modified=result.last_modified,
            needs_embedding=True,
        )

        log_page_outcome(job_id, url, "success")
        increment_job_counter(job_id, "pages_crawled")
        logger.info("Crawled and persisted: %s (%d chars)", url, len(text))
        return "success"
    else:
        log_page_outcome(job_id, url, "failed", "No content extracted from page")
        increment_job_counter(job_id, "pages_failed")
        return "failed"


# --------------------------------------------------------------------------- #
# Helpers                                                                     #
# --------------------------------------------------------------------------- #

def _headers_unchanged(head, known: dict) -> bool:
    """
    Return True if the ETag and/or Last-Modified from the HEAD response
    match the values stored in the `pages` row for this URL.

    We only skip if at least one header is present and matches.
    If neither header is present we cannot confirm the page is unchanged,
    so we fall through to a full fetch.
    """
    stored_etag = known.get("http_etag")
    stored_lm = known.get("http_last_modified")

    etag_match = head.etag and stored_etag and head.etag == stored_etag
    lm_match = head.last_modified and stored_lm and head.last_modified == stored_lm

    return bool(etag_match or lm_match)
