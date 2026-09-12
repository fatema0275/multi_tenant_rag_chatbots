"""
db/crawl_logs.py — Insert helpers for the `crawl_logs` table.

The `page_url` and `error_reason` columns are added by migration
20260101000016-extend-crawl-logs.js — they are the canonical column
names used throughout this service (the original `url` / `reason`
columns from migration 004 are retained for backward compat but not
written to by this service).

Valid status values (extended by migration 016):
  success, failed, robots_disallowed, timeout,
  duplicate, skipped_unchanged, removed
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from crawl_service.db.connection import get_db

logger = logging.getLogger(__name__)

# All legal status values for the crawl_logs.status ENUM
VALID_STATUSES = frozenset({
    "success",
    "failed",
    "robots_disallowed",
    "timeout",
    "duplicate",
    "skipped_unchanged",
    "removed",
    "success-ocr",
    "skipped-image-only",
    "success-ocr-image",
    "skipped-image-no-text",
})



def log_page_outcome(
    crawl_job_id: int,
    page_url: str,
    status: str,
    error_reason: Optional[str] = None,
) -> None:
    """
    Write one outcome row to crawl_logs.

    Parameters
    ----------
    crawl_job_id : int
        FK to the parent crawl_jobs row.
    page_url : str
        The URL that was processed (or attempted).
    status : str
        One of VALID_STATUSES.
    error_reason : str | None
        Human-readable explanation for failed/skipped outcomes.
    """
    if status not in VALID_STATUSES:
        logger.warning("Unknown crawl_logs status %r — defaulting to 'failed'", status)
        status = "failed"

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crawl_logs
                    (crawl_job_id, page_url, url, status, error_reason, reason, crawled_at)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    crawl_job_id,
                    page_url,
                    page_url,             # legacy `url` column kept in sync
                    status,
                    error_reason,
                    error_reason,         # legacy `reason` column kept in sync
                    datetime.now(tz=timezone.utc),
                ),
            )
