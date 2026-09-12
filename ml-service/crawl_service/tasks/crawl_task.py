"""
tasks/crawl_task.py — Celery task that orchestrates a full crawl job under site_id.
"""

import logging
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
import posixpath
from typing import Optional

from crawl_service.celery_app import celery
from crawl_service.config import cfg
from crawl_service.crawler.discovery import discover_urls
from crawl_service.crawler.extractor import (
    compute_hash,
    content_changed,
    extract_image_title,
    extract_text,
    image_extract,
    is_content_sufficient,
    pdf_extract,
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
    mark_job_cancelled,
    update_site_crawl_status,
)
from crawl_service.db.crawl_logs import log_page_outcome
from crawl_service.db.pages import (
    bump_last_crawled,
    get_existing_pages,
    mark_pages_removed,
    upsert_page,
)

logger = logging.getLogger(__name__)

_domain_locks: dict[str, threading.Lock] = defaultdict(threading.Lock)
_domain_locks_guard = threading.Lock()

_cancelled_jobs: set[int] = set()


def cancel_job(job_id: int) -> None:
    _cancelled_jobs.add(job_id)
    logger.info("Job %d registered for cancellation", job_id)


def is_job_cancelled(job_id: int) -> bool:
    return job_id in _cancelled_jobs


def _get_domain_lock(domain: str) -> threading.Lock:
    with _domain_locks_guard:
        return _domain_locks[domain]


@celery.task(
    name="crawl_service.tasks.crawl_task.run_crawl",
    max_retries=0,
    acks_late=True,
    time_limit=7200,
    soft_time_limit=6900,
)
def run_crawl(job_id: int, website_id: int, domain: str, site_id: Optional[str] = None) -> dict:
    """
    Main Celery task — orchestrates the entire crawl for one site/website.
    """
    logger.info("=== Crawl job %d starting: site_id=%s website_id=%d domain=%s ===", job_id, site_id, website_id, domain)

    target_site_id = site_id or str(website_id)

    try:
        existing_pages = get_existing_pages(site_id=target_site_id, website_id=website_id)
        crawl_type = "incremental" if existing_pages else "first"

        mark_job_running(job_id, crawl_type)
        if site_id:
            update_site_crawl_status(site_id, "running")

        logger.info("Job %d: crawl_type=%s, existing_pages=%d", job_id, crawl_type, len(existing_pages))

        scheme = "https"
        discovered_urls = discover_urls(domain, scheme, job_id=job_id)
        max_pages = getattr(cfg, "MAX_PAGES", 200)
        stall_timeout = getattr(cfg, "STALL_TIMEOUT", 300)

        target_urls = discovered_urls[:max_pages] if discovered_urls else []
        logger.info("Job %d: discovered %d URLs total (processing top %d max_pages)", job_id, len(discovered_urls), len(target_urls))

        if not target_urls:
            logger.warning("Job %d: no URLs discovered. Marking completed", job_id)
            mark_job_completed(job_id)
            if site_id:
                update_site_crawl_status(site_id, "completed")
            log_page_outcome(job_id, "site_crawl", "completed", "reached page limit (0/0 pages)")
            return {"job_id": job_id, "status": "completed", "pages_found": 0}

        try:
            increment_job_counter(job_id, "pages_found", len(target_urls))
        except Exception as counter_err:
            logger.warning("Failed to set pages_found counter for job %d: %s", job_id, counter_err)

        live_urls: set[str] = set()
        last_progress_time = time.time()
        was_cancelled = False
        was_stalled = False

        with ThreadPoolExecutor(max_workers=cfg.MAX_WORKERS) as executor:
            futures = {
                executor.submit(
                    _process_page,
                    url=url,
                    job_id=job_id,
                    website_id=website_id,
                    site_id=target_site_id,
                    domain=domain,
                    scheme=scheme,
                    crawl_type=crawl_type,
                    existing_pages=existing_pages,
                ): url
                for url in target_urls
            }

            for future in as_completed(futures):
                if is_job_cancelled(job_id):
                    logger.info("Job %d: manual stop detected. Terminating crawl execution", job_id)
                    was_cancelled = True
                    break

                if time.time() - last_progress_time > stall_timeout:
                    logger.warning("Job %d: stalled (no progress for %d seconds)", job_id, stall_timeout)
                    was_stalled = True
                    break

                url = futures[future]
                try:
                    outcome = future.result()
                    last_progress_time = time.time()
                    if outcome in ("success", "success-ocr", "success-ocr-image", "skipped_unchanged", "duplicate"):
                        live_urls.add(url)

                except Exception as exc:
                    logger.error("Unhandled exception processing %s: %s", url, exc, exc_info=True)
                    log_page_outcome(job_id, url, "failed", str(exc))
                    increment_job_counter(job_id, "pages_failed")
                    last_progress_time = time.time()

        if was_cancelled:
            mark_job_cancelled(job_id)
            if site_id:
                update_site_crawl_status(site_id, "cancelled")
            cancel_msg = f"Crawl stopped. {len(live_urls)}/est. {len(target_urls)} pages completed."
            log_page_outcome(job_id, "site_crawl", "cancelled", cancel_msg)
            return {"job_id": job_id, "status": "cancelled", "pages_crawled": len(live_urls)}

        if was_stalled:
            mark_job_failed(job_id, "stalled")
            if site_id:
                update_site_crawl_status(site_id, "failed")
            log_page_outcome(job_id, "site_crawl", "failed", "stalled: no progress for 5 minutes")
            return {"job_id": job_id, "status": "failed", "reason": "stalled"}

        removed = mark_pages_removed(site_id=target_site_id, website_id=website_id, still_live_urls=live_urls)
        for removed_url in removed:
            log_page_outcome(job_id, removed_url, "removed", "Not found in current crawl")

        mark_job_completed(job_id)
        if site_id:
            update_site_crawl_status(site_id, "completed")

        limit_msg = f"reached page limit ({len(live_urls)}/{max_pages} pages)" if len(target_urls) >= max_pages else f"reached page limit ({len(live_urls)}/{len(target_urls)} pages)"
        log_page_outcome(job_id, "site_crawl", "completed", limit_msg)
        logger.info("=== Crawl job %d completed for site_id=%s: %s ===", job_id, target_site_id, limit_msg)

        return {
            "job_id": job_id,
            "status": "completed",
            "pages_found": len(target_urls),
            "pages_crawled": len(live_urls)
        }

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Crawl job %d failed: %s", job_id, error_msg, exc_info=True)
        mark_job_failed(job_id, error_msg)
        if site_id:
            update_site_crawl_status(site_id, "failed")
        raise


def _notify_node_backend(
    website_id: int,
    site_id: str,
    url: str,
    title: Optional[str],
    text: str,
) -> None:
    """Notify Node.js backend to generate and store document chunks (Module 3)."""
    try:
        import os, requests
        node_backend_url = os.getenv("NODE_BACKEND_URL", "http://localhost:5000")
        requests.post(
            f"{node_backend_url}/api/websites/{website_id}/store-chunks",
            json={
                "siteId": site_id,
                "pageUrl": url,
                "pageTitle": title,
                "pageText": text,
                "domSelector": None,
            },
            timeout=15,
        )
    except Exception as kb_err:
        logger.error("Failed to store chunks for %s: %s", url, kb_err)


def _process_page(
    *,
    url: str,
    job_id: int,
    website_id: int,
    site_id: str,
    domain: str,
    scheme: str,
    crawl_type: str,
    existing_pages: dict,
) -> str:
    if not is_allowed(url, domain, scheme):
        log_page_outcome(job_id, url, "robots_disallowed", "Disallowed by robots.txt")
        increment_job_counter(job_id, "pages_skipped")
        return "robots_disallowed"

    known = existing_pages.get(url)
    session = build_session()
    crawl_delay = get_crawl_delay(domain, scheme)

    domain_lock = _get_domain_lock(domain)
    with domain_lock:
        if crawl_type == "incremental" and known:
            head = head_check(url, session)
            if head.reachable and _headers_unchanged(head, known):
                logger.debug("HEAD unchanged for %s — skipping", url)
                bump_last_crawled(url, site_id)
                log_page_outcome(job_id, url, "skipped_unchanged", "ETag/Last-Modified unchanged")
                increment_job_counter(job_id, "pages_skipped")
                time.sleep(crawl_delay)
                return "skipped_unchanged"

        result: FetchResult = fetch_page(url, session)
        time.sleep(crawl_delay)

    if not result.ok:
        status = "timeout" if result.error == "timeout" else "failed"
        log_page_outcome(job_id, url, status, result.error)
        increment_job_counter(job_id, "pages_failed")
        return status

    # ======================================================================= #
    # CONTENT-TYPE ROUTING DECISION TREE
    # ======================================================================= #
    # Inspect Content-Type header and URL path to determine format:
    #   1. PDF Documents: 'application/pdf' or path ends with '.pdf'
    #      -> Routed to pdf_extract(result.content, url)
    #      -> Native text layer (>= 50 chars): status='success', source_type='pdf'
    #      -> Scanned PDF (< 50 chars): OCR fallback (pdf2image 200 DPI + pytesseract)
    #         * OCR text non-empty: status='success-ocr', source_type='pdf-ocr'
    #         * OCR empty: status='skipped-image-only', skip page
    #   2. Direct Image URLs: 'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    #      or path ends with ('.jpg', '.jpeg', '.png', '.webp')
    #      -> Routed to image_extract(result.content, url) via PIL + pytesseract
    #      -> Filename used as page title
    #      -> OCR text > 20 chars: status='success-ocr-image', source_type='image-ocr'
    #      -> OCR text <= 20 chars: status='skipped-image-no-text', skip page
    #   3. HTML Webpages (Default):
    #      -> Routed to extract_text(result.html, url) (Trafilatura + BS4 fallback)
    #      -> Captures img alt attributes and figcaption text (> 10 chars)
    #      -> Playwright escalation if text < cfg.MIN_TEXT_LENGTH
    #      -> status='success', source_type='html'
    # ======================================================================= #

    content_type = (result.content_type or "").lower()
    url_path = urlparse(url).path.lower()

    is_pdf = "application/pdf" in content_type or url_path.endswith(".pdf")
    is_image = (
        any(ct in content_type for ct in ["image/jpeg", "image/png", "image/webp", "image/gif"])
        or any(url_path.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"])
    )

    # ----------------------------------------------------------------------- #
    # BRANCH A: PDF Document Handling
    # ----------------------------------------------------------------------- #
    if is_pdf:
        pdf_text, is_ocr = pdf_extract(result.content, url=url)
        if not pdf_text:
            log_page_outcome(
                job_id,
                url,
                "skipped-image-only",
                "PDF has no extractable text layer and OCR returned empty",
            )
            increment_job_counter(job_id, "pages_skipped")
            return "skipped-image-only"

        source_type = "pdf-ocr" if is_ocr else "pdf"
        log_status = "success-ocr" if is_ocr else "success"
        pdf_title = posixpath.basename(urlparse(url).path.rstrip("/")) or "PDF Document"

        new_hash = compute_hash(pdf_text)
        if crawl_type == "incremental" and known and not content_changed(pdf_text, known.get("content_hash")):
            bump_last_crawled(url, site_id)
            log_page_outcome(job_id, url, "skipped_unchanged", "Content hash unchanged after extraction")
            increment_job_counter(job_id, "pages_skipped")
            return "skipped_unchanged"

        upsert_page(
            site_id=site_id,
            website_id=website_id,
            url=url,
            title=pdf_title,
            raw_text=pdf_text,
            content_hash=new_hash,
            http_etag=result.etag,
            http_last_modified=result.last_modified,
            needs_embedding=True,
            source_type=source_type,
        )

        log_page_outcome(job_id, url, log_status)
        increment_job_counter(job_id, "pages_crawled")
        logger.info("Crawled and persisted %s (%s): %s (%d chars)", source_type, log_status, url, len(pdf_text))

        _notify_node_backend(website_id, site_id, url, pdf_title, pdf_text)
        return log_status

    # ----------------------------------------------------------------------- #
    # BRANCH B: Direct Image URLs Handling
    # ----------------------------------------------------------------------- #
    elif is_image:
        image_text = image_extract(result.content, url=url)
        if not image_text:
            log_page_outcome(
                job_id,
                url,
                "skipped-image-no-text",
                "Image OCR yielded <= 20 characters of text",
            )
            increment_job_counter(job_id, "pages_skipped")
            return "skipped-image-no-text"

        source_type = "image-ocr"
        log_status = "success-ocr-image"
        img_title = extract_image_title(url)

        new_hash = compute_hash(image_text)
        if crawl_type == "incremental" and known and not content_changed(image_text, known.get("content_hash")):
            bump_last_crawled(url, site_id)
            log_page_outcome(job_id, url, "skipped_unchanged", "Content hash unchanged after extraction")
            increment_job_counter(job_id, "pages_skipped")
            return "skipped_unchanged"

        upsert_page(
            site_id=site_id,
            website_id=website_id,
            url=url,
            title=img_title,
            raw_text=image_text,
            content_hash=new_hash,
            http_etag=result.etag,
            http_last_modified=result.last_modified,
            needs_embedding=True,
            source_type=source_type,
        )

        log_page_outcome(job_id, url, log_status)
        increment_job_counter(job_id, "pages_crawled")
        logger.info("Crawled and persisted %s (%s): %s (%d chars)", source_type, log_status, url, len(image_text))

        _notify_node_backend(website_id, site_id, url, img_title, image_text)
        return log_status

    # ----------------------------------------------------------------------- #
    # BRANCH C: HTML Webpage Handling (Default)
    # ----------------------------------------------------------------------- #
    else:
        text, title = extract_text(result.html, url=url)

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

        new_hash = compute_hash(text) if text else None

        if crawl_type == "incremental" and known and not content_changed(text, known.get("content_hash")):
            bump_last_crawled(url, site_id)
            log_page_outcome(job_id, url, "skipped_unchanged", "Content hash unchanged after extraction")
            increment_job_counter(job_id, "pages_skipped")
            return "skipped_unchanged"

        if text.strip() and new_hash:
            upsert_page(
                site_id=site_id,
                website_id=website_id,
                url=url,
                title=title,
                raw_text=text,
                content_hash=new_hash,
                http_etag=result.etag,
                http_last_modified=result.last_modified,
                needs_embedding=True,
                source_type="html",
            )

            log_page_outcome(job_id, url, "success")
            increment_job_counter(job_id, "pages_crawled")
            logger.info("Crawled and persisted: %s (%d chars)", url, len(text))

            _notify_node_backend(website_id, site_id, url, title, text)
            return "success"
        else:
            log_page_outcome(job_id, url, "failed", "No content extracted from page")
            increment_job_counter(job_id, "pages_failed")
            return "failed"



def _headers_unchanged(head, known: dict) -> bool:
    stored_etag = known.get("http_etag")
    stored_lm = known.get("http_last_modified")

    etag_match = head.etag and stored_etag and head.etag == stored_etag
    lm_match = head.last_modified and stored_lm and head.last_modified == stored_lm

    return bool(etag_match or lm_match)
