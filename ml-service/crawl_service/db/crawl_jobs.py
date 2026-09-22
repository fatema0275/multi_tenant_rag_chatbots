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
    If an active job has stalled without heartbeats (running > 15m without update,
    or queued > 5m without start), it is automatically marked failed so subsequent
    crawls are never permanently blocked.
    """
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, status, started_at, created_at, updated_at
                FROM   crawl_jobs
                WHERE  website_id = %s
                  AND  status IN ('queued', 'running')
                ORDER  BY id DESC
                LIMIT  1
                """,
                (website_id,),
            )
            row = cur.fetchone()
            if not row:
                return None

            job_id = row["id"]
            status = row["status"]
            last_activity = row["updated_at"] or row["created_at"] or now

            # Check if job is stale
            is_stale = False
            reason = ""
            if status == "running":
                # Stalled running job (no heartbeat for > 15 minutes)
                if (now - last_activity).total_seconds() > 900:
                    is_stale = True
                    reason = "Job timed out: no worker activity for > 15 minutes"
            elif status == "queued":
                # Orphaned queued job (queued for > 5 minutes without starting)
                if (now - last_activity).total_seconds() > 300:
                    is_stale = True
                    reason = "Job timed out: stayed in queued state for > 5 minutes"

            if is_stale:
                logger.warning(
                    "Evicting stale crawl job %s for website_id=%s: %s",
                    job_id, website_id, reason
                )
                cur.execute(
                    """
                    UPDATE crawl_jobs
                    SET    status        = 'failed',
                           completed_at  = %s,
                           updated_at    = %s,
                           error_message = %s
                    WHERE  id = %s
                    """,
                    (now, now, reason, job_id),
                )
                return None

            return {"id": row["id"], "status": row["status"]}


# --------------------------------------------------------------------------- #
# Write helpers                                                                #
# --------------------------------------------------------------------------- #

def create_crawl_job(website_id: int) -> int:
    """
    Insert a new crawl_jobs row with status='queued'.
    Returns the new job's id.
    """
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crawl_jobs (website_id, status, created_at, updated_at)
                VALUES (%s, 'queued', %s, %s)
                RETURNING id
                """,
                (website_id, now, now),
            )
            row = cur.fetchone()
    return row["id"]


def touch_job_heartbeat(job_id: int) -> None:
    """Touch the updated_at timestamp to indicate worker progress."""
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    updated_at = %s
                WHERE  id = %s
                """,
                (now, job_id),
            )


def mark_job_running(job_id: int, crawl_type: str) -> None:
    """Transition status queued → running and record start time + crawl_type."""
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status     = 'running',
                       crawl_type = %s,
                       started_at = %s,
                       updated_at = %s
                WHERE  id = %s
                """,
                (crawl_type, now, now, job_id),
            )


def increment_job_counter(job_id: int, counter: str, amount: int = 1) -> None:
    """
    Atomically increment one counter column on a crawl_jobs row and refresh updated_at.
    """
    allowed = {"pages_found", "pages_crawled", "pages_failed", "pages_skipped"}
    if counter not in allowed:
        raise ValueError(f"Unknown counter: {counter!r}. Must be one of {allowed}")

    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE crawl_jobs
                SET    {counter} = {counter} + %s,
                       updated_at = %s
                WHERE  id = %s
                """,
                (amount, now, job_id),
            )


def set_job_counter(job_id: int, counter: str, value: int) -> None:
    """
    Set the exact value of a counter on crawl_jobs and refresh updated_at.
    """
    allowed = {"pages_found", "pages_crawled", "pages_failed", "pages_skipped"}
    if counter not in allowed:
        raise ValueError(f"Unknown counter: {counter!r}. Must be one of {allowed}")

    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE crawl_jobs
                SET    {counter} = %s,
                       updated_at = %s
                WHERE  id = %s
                """,
                (value, now, job_id),
            )


def mark_job_completed(job_id: int) -> None:
    """Transition status running → completed."""
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status       = 'completed',
                       completed_at = %s,
                       updated_at   = %s
                WHERE  id = %s
                """,
                (now, now, job_id),
            )


def mark_job_failed(job_id: int, error_message: str) -> None:
    """Transition status running/queued → failed, storing the error."""
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status        = 'failed',
                       completed_at  = %s,
                       updated_at    = %s,
                       error_message = %s
                WHERE  id = %s
                """,
                (now, now, error_message[:2000], job_id),
            )


def mark_job_cancelled(job_id: int) -> None:
    """Transition status running/queued → cancelled."""
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status       = 'cancelled',
                       completed_at = %s,
                       updated_at   = %s
                WHERE  id = %s
                """,
                (now, now, job_id),
            )


def cleanup_orphaned_jobs() -> int:
    """
    On service boot or restart, mark dangling 'queued' or 'running' jobs as cancelled.
    Since daemon threads do not survive service restarts, this prevents permanent 409 Conflict locks.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE crawl_jobs
                SET    status = 'cancelled',
                       completed_at = %s,
                       error_message = 'Job cancelled due to service restart'
                WHERE  status IN ('queued', 'running')
                RETURNING id
                """,
                (datetime.now(tz=timezone.utc),),
            )
            rows = cur.fetchall()
            count = len(rows)
            if count > 0:
                logger.info("Cleaned up %d orphaned crawl job(s) from previous run: %s", count, [r["id"] for r in rows])
            return count



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
