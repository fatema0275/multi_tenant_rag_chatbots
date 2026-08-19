"""
db/pages.py — Upsert and query helpers for the `pages` table linked to `site_id`.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Union, Any

from crawl_service.db.connection import get_db

logger = logging.getLogger(__name__)


def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def get_existing_pages(site_id: Optional[str] = None, website_id: Optional[int] = None) -> dict[str, dict]:
    """
    Return a dict keyed by URL for all known pages of a site.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            if site_id and is_valid_uuid(site_id):
                cur.execute(
                    """
                    SELECT id, url, content_hash,
                           http_etag, http_last_modified, crawl_status
                    FROM   pages
                    WHERE  site_id = %s::uuid OR (site_id IS NULL AND website_id = %s)
                    """,
                    (str(site_id), int(website_id) if website_id else -1),
                )
            elif website_id:
                cur.execute(
                    """
                    SELECT id, url, content_hash,
                           http_etag, http_last_modified, crawl_status
                    FROM   pages
                    WHERE  website_id = %s
                    """,
                    (int(website_id),),
                )
            elif site_id and str(site_id).isdigit():
                cur.execute(
                    """
                    SELECT id, url, content_hash,
                           http_etag, http_last_modified, crawl_status
                    FROM   pages
                    WHERE  website_id = %s
                    """,
                    (int(site_id),),
                )
            else:
                return {}
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


def upsert_page(
    *,
    site_id: Optional[str] = None,
    website_id: Optional[int] = None,
    url: str,
    title: Optional[str],
    raw_text: str,
    content_hash: str,
    http_etag: Optional[str] = None,
    http_last_modified: Optional[str] = None,
    needs_embedding: bool = True,
) -> int:
    """
    Insert a new page or update an existing one under site_id.
    """
    now = datetime.now(tz=timezone.utc)
    valid_site_id = str(site_id) if site_id and is_valid_uuid(site_id) else None

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pages
                    (site_id, website_id, url, title, raw_text, content_hash,
                     http_etag, http_last_modified, crawl_status,
                     needs_embedding, last_crawled_at, created_at)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, %s)
                ON CONFLICT (site_id, url) WHERE site_id IS NOT NULL DO UPDATE SET
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
                    valid_site_id,
                    website_id,
                    url,
                    title,
                    raw_text,
                    content_hash,
                    http_etag,
                    http_last_modified,
                    needs_embedding,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()
    return row["id"]


def bump_last_crawled(url: str, site_id: Optional[str] = None, website_id: Optional[int] = None) -> None:
    """
    Update last_crawled_at for a page whose content has not changed.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            if site_id and is_valid_uuid(site_id):
                cur.execute(
                    """
                    UPDATE pages
                    SET    last_crawled_at = %s
                    WHERE  (site_id = %s::uuid OR (site_id IS NULL AND website_id = %s)) AND url = %s
                    """,
                    (datetime.now(tz=timezone.utc), str(site_id), int(website_id) if website_id else -1, url),
                )
            else:
                cur.execute(
                    """
                    UPDATE pages
                    SET    last_crawled_at = %s
                    WHERE  website_id = %s AND url = %s
                    """,
                    (datetime.now(tz=timezone.utc), int(website_id or site_id), url),
                )


def mark_pages_removed(site_id: Optional[str] = None, website_id: Optional[int] = None, still_live_urls: set[str] = None) -> list[str]:
    """
    Mark pages that were previously known but are no longer discoverable as crawl_status='removed'.
    """
    if still_live_urls is None:
        still_live_urls = set()

    with get_db() as conn:
        with conn.cursor() as cur:
            if site_id and is_valid_uuid(site_id):
                cur.execute(
                    """
                    SELECT url FROM pages
                    WHERE  (site_id = %s::uuid OR (site_id IS NULL AND website_id = %s)) AND crawl_status = 'active'
                    """,
                    (str(site_id), int(website_id) if website_id else -1),
                )
            else:
                cur.execute(
                    """
                    SELECT url FROM pages
                    WHERE  website_id = %s AND crawl_status = 'active'
                    """,
                    (int(website_id or site_id),),
                )

            all_active = {row["url"] for row in cur.fetchall()}
            removed_urls = all_active - still_live_urls

            if removed_urls:
                if site_id and is_valid_uuid(site_id):
                    cur.execute(
                        """
                        UPDATE pages
                        SET    crawl_status = 'removed'
                        WHERE  (site_id = %s::uuid OR (site_id IS NULL AND website_id = %s))
                          AND  url = ANY(%s)
                        """,
                        (str(site_id), int(website_id) if website_id else -1, list(removed_urls)),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE pages
                        SET    crawl_status = 'removed'
                        WHERE  website_id = %s
                          AND  url = ANY(%s)
                        """,
                        (int(website_id or site_id), list(removed_urls)),
                    )
                logger.info("Marked %d page(s) as removed for site_id=%s website_id=%s", len(removed_urls), site_id, website_id)

    return list(removed_urls)
