"""
db/pages.py — Upsert and query helpers for the `pages` table.

The `pages` table is created by migration 20260101000014-create-pages.js.
It is the central content store: one row per unique URL per website.

Key operations:
  - get_existing_pages     — fetch all known pages for a website (URL,
                             content_hash, http_etag, http_last_modified)
  - upsert_page            — INSERT ... ON CONFLICT DO UPDATE
  - mark_pages_removed     — mark URLs no longer found in the current crawl
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from crawl_service.db.connection import get_db

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Read helpers                                                                 #
# --------------------------------------------------------------------------- #

def get_existing_pages(website_id: int) -> dict[str, dict]:
    """
    Return a dict keyed by URL for all known pages of a website.

    Each value is:
        {
            "id": int,
            "content_hash": str | None,
            "http_etag": str | None,
            "http_last_modified": str | None,
            "crawl_status": str,
        }

    Used at the start of an incremental crawl to compare against what was
    previously stored.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, url, content_hash,
                       http_etag, http_last_modified, crawl_status
                FROM   pages
                WHERE  website_id = %s
                """,
                (website_id,),
            )
            rows = cur.fetchall()

    return {
        row["url"]: {
            "id": row["id"],
            "content_hash": row["content_hash"],
            "http_etag": row["http_etag"],
            "http_last_modified": row["http_last_modified"],
            "crawl_status": row["crawl_status"],
        }
        for row in rows
    }


# --------------------------------------------------------------------------- #
# Write helpers                                                                #
# --------------------------------------------------------------------------- #

def upsert_page(
    *,
    website_id: int,
    url: str,
    title: Optional[str],
    raw_text: str,
    content_hash: str,
    http_etag: Optional[str] = None,
    http_last_modified: Optional[str] = None,
    needs_embedding: bool = True,
) -> int:
    """
    Insert a new page or update an existing one.

    Returns the page's `id`.

    On conflict (website_id, url) the row is updated with the new content,
    hash, HTTP cache headers, and the `needs_embedding` flag.  `created_at`
    is left untouched (first-seen timestamp).
    """
    now = datetime.now(tz=timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pages
                    (website_id, url, title, raw_text, content_hash,
                     http_etag, http_last_modified, crawl_status,
                     needs_embedding, last_crawled_at, created_at)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, %s)
                ON CONFLICT (website_id, url) DO UPDATE SET
                    title             = EXCLUDED.title,
                    raw_text          = EXCLUDED.raw_text,
                    content_hash      = EXCLUDED.content_hash,
                    http_etag         = EXCLUDED.http_etag,
                    http_last_modified= EXCLUDED.http_last_modified,
                    crawl_status      = 'active',
                    needs_embedding   = EXCLUDED.needs_embedding,
                    last_crawled_at   = EXCLUDED.last_crawled_at
                RETURNING id
                """,
                (
                    website_id, url, title, raw_text, content_hash,
                    http_etag, http_last_modified,
                    needs_embedding, now, now,
                ),
            )
            row = cur.fetchone()
    return row["id"]


def bump_last_crawled(url: str, website_id: int) -> None:
    """
    Update last_crawled_at for a page whose content has not changed
    (incremental crawl — skipped-unchanged).

    The page's content_hash, raw_text, and needs_embedding are NOT touched,
    so the embedding pipeline sees no change and does not reprocess this page.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE pages
                SET    last_crawled_at = %s
                WHERE  website_id = %s AND url = %s
                """,
                (datetime.now(tz=timezone.utc), website_id, url),
            )


def mark_pages_removed(website_id: int, still_live_urls: set[str]) -> list[str]:
    """
    Mark pages that were previously known but are no longer discoverable
    in the current crawl as crawl_status='removed'.

    Returns the list of URLs that were marked removed.

    Pages are NOT deleted — historical content is preserved in case
    they reappear or for audit purposes.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            # Build the set of URLs that should be marked removed.
            # We use a temporary approach: fetch all active URLs, diff, update.
            cur.execute(
                """
                SELECT url FROM pages
                WHERE  website_id = %s AND crawl_status = 'active'
                """,
                (website_id,),
            )
            all_active = {row["url"] for row in cur.fetchall()}

            removed_urls = all_active - still_live_urls

            if removed_urls:
                # psycopg2 ANY(%s) with a list is safe and avoids IN-list size limits
                cur.execute(
                    """
                    UPDATE pages
                    SET    crawl_status = 'removed'
                    WHERE  website_id = %s
                      AND  url = ANY(%s)
                    """,
                    (website_id, list(removed_urls)),
                )
                logger.info(
                    "Marked %d page(s) as removed for website_id=%s",
                    len(removed_urls), website_id
                )

    return list(removed_urls)
