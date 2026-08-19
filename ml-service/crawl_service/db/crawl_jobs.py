"""
db/crawl_jobs.py — CRUD helpers for the `crawl_jobs` and `sites` tables.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from crawl_service.db.connection import get_db

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Read helpers                                                                 #
# --------------------------------------------------------------------------- #

def get_crawl_job(job_id: int) -> Optional[dict]:
    """Return a single crawl_jobs row as a dict, or None if not found."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, website_id, status, crawl_type,
                       pages_found, pages_crawled, pages_failed, pages_skipped,
                       started_at, completed_at, error_message
                FROM   crawl_jobs
                WHERE  id = %s
                """,
                (job_id,),
            )
            row = cur.fetchone()
    return dict(row) if row else None


def get_active_job_for_website(website_id: int) -> Optional[dict]:
    """
    Return the first queued/running job for a website, or None.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, status
                FROM   crawl_jobs
                WHERE  website_id = %s
                  AND  status IN ('queued', 'running')
                ORDER  BY id DESC
                LIMIT  1
                """,
                (website_id,),
            )
            row = cur.fetchone()
    return dict(row) if row else None


# --------------------------------------------------------------------------- #
# Write helpers                                                                #
# --------------------------------------------------------------------------- #

def create_crawl_job(website_id: int) -> int:
    """
    Insert a new crawl_jobs row with status='queued'.
    Returns the new job's id.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crawl_jobs (website_id, status)
                VALUES (%s, 'queued')
                RETURNING id
                """,
                (website_id,),
            )
            row = cur.fetchone()
    return row["id"]


def mark_job_running(job_id: int, crawl_type: str) -> None:
    """Transition status queued → running and record start time + crawl_type."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status     = 'running',
                       crawl_type = %s,
                       started_at = %s
                WHERE  id = %s
                """,
                (crawl_type, datetime.now(tz=timezone.utc), job_id),
            )


def increment_job_counter(job_id: int, counter: str, amount: int = 1) -> None:
    """
    Atomically increment one counter column on a crawl_jobs row.
    """
    allowed = {"pages_found", "pages_crawled", "pages_failed", "pages_skipped"}
    if counter not in allowed:
        raise ValueError(f"Unknown counter: {counter!r}. Must be one of {allowed}")

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE crawl_jobs SET {counter} = {counter} + %s WHERE id = %s",
                (amount, job_id),
            )


def mark_job_completed(job_id: int) -> None:
    """Transition status running → completed."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status       = 'completed',
                       completed_at = %s
                WHERE  id = %s
                """,
                (datetime.now(tz=timezone.utc), job_id),
            )


def mark_job_failed(job_id: int, error_message: str) -> None:
    """Transition status running/queued → failed, storing the error."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status        = 'failed',
                       completed_at  = %s,
                       error_message = %s
                WHERE  id = %s
                """,
                (datetime.now(tz=timezone.utc), error_message[:2000], job_id),
            )


def mark_job_cancelled(job_id: int) -> None:
    """Transition status running/queued → cancelled."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status       = 'cancelled',
                       completed_at = %s
                WHERE  id = %s
                """,
                (datetime.now(tz=timezone.utc), job_id),
            )


def update_site_crawl_status(site_id: str, status: str) -> None:
    """Update crawl_status and last_crawled_at on sites table."""
    if not site_id:
        return
    with get_db() as conn:
        with conn.cursor() as cur:
            if status == "completed":
                cur.execute(
                    """
                    UPDATE sites
                    SET    crawl_status = %s,
                           last_crawled_at = %s,
                           updated_at = %s
                    WHERE  id = %s
                    """,
                    (status, datetime.now(tz=timezone.utc), datetime.now(tz=timezone.utc), site_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE sites
                    SET    crawl_status = %s,
                           updated_at = %s
                    WHERE  id = %s
                    """,
                    (status, datetime.now(tz=timezone.utc), site_id),
                )
