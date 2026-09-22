"""
routes/crawl.py — HTTP endpoints for the crawl service.

Endpoints:
  POST /crawl
      Body: { website_id, domain, user_id }
      Core Deduplication (Step 6):
        - Check if domain exists in `sites` table.
        - If `sites` row exists and `crawl_status == 'completed'`: skip crawl entirely
          and link user's `websites` row (`site_id`) to existing `sites.id`.
        - If `sites` row does not exist or is not completed: create/update `sites` row,
          link `websites.site_id`, queue crawl, and populate `pages` & `document_chunks`
          under `site_id`.

  GET /crawl/<job_id>
      Response 200: job details

  POST /crawl/<job_id>/stop
      Cancel running job
"""

import logging
from flask import Blueprint, request, jsonify
from crawl_service.db.crawl_jobs import (
    get_crawl_job,
    create_crawl_job,
    get_active_job_for_website,
    mark_job_cancelled,
)
from crawl_service.db.connection import get_db
from crawl_service.tasks.crawl_task import run_crawl

logger = logging.getLogger(__name__)

crawl_bp = Blueprint("crawl", __name__)


@crawl_bp.post("/crawl")
def trigger_crawl():
    """
    Accept a crawl request from the Node.js backend with domain-level deduplication.
    """
    body = request.get_json(silent=True) or {}

    website_id = body.get("website_id")
    domain = body.get("domain")
    user_id = body.get("user_id")

    force = bool(body.get("force", False))

    if not website_id or not domain:
        return jsonify({"error": "website_id and domain are required"}), 400

    try:
        website_id = int(website_id)
    except (TypeError, ValueError):
        return jsonify({"error": "website_id must be an integer"}), 400

    domain_clean = domain.strip().lower()

    # Re-verify website ownership & verification_status
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, domain, verification_status, site_id
                FROM   websites
                WHERE  id = %s
                """,
                (website_id,),
            )
            website_row = cur.fetchone()

    if not website_row:
        return jsonify({"error": "Website not found"}), 404

    db_domain = website_row["domain"]
    verification_status = website_row["verification_status"]

    if verification_status != "verified":
        return jsonify({
            "error": (
                f"Cannot crawl an unverified website "
                f"(current status: {verification_status}). "
                "Complete domain verification first."
            )
        }), 422

    # Check if a row already exists in `sites` for this domain
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, domain, crawl_status
                FROM   sites
                WHERE  LOWER(domain) = %s
                """,
                (domain_clean,),
            )
            site_row = cur.fetchone()

            if site_row:
                site_id = str(site_row["id"])
                cur.execute(
                    """
                    UPDATE sites
                    SET    crawl_status = 'pending', updated_at = NOW()
                    WHERE  id = %s
                    """,
                    (site_id,),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO sites (domain, crawl_status, created_at, updated_at)
                    VALUES (%s, 'pending', NOW(), NOW())
                    RETURNING id
                    """,
                    (domain_clean,),
                )
                site_id = str(cur.fetchone()["id"])

            # Link website to site_id
            cur.execute(
                """
                UPDATE websites
                SET    site_id = %s
                WHERE  id = %s
                """,
                (site_id, website_id),
            )

            # If force=True, wipe previous pages & document_chunks so full fresh crawl runs
            if force:
                logger.info("Force re-crawl requested for site_id=%s website_id=%s. Clearing existing chunks & pages.", site_id, website_id)
                cur.execute(
                    "DELETE FROM document_chunks WHERE site_id = %s OR website_id = %s",
                    (site_id, website_id),
                )
                cur.execute(
                    "DELETE FROM pages WHERE site_id = %s OR website_id = %s",
                    (site_id, website_id),
                )

    # --- Prevent duplicate concurrent jobs ---
    active_job = get_active_job_for_website(website_id)
    if active_job:
        if force:
            logger.info("Force re-crawl requested for website_id=%s. Cancelling existing active job %s.", website_id, active_job["id"])
            from crawl_service.tasks.crawl_task import cancel_job
            cancel_job(active_job["id"])
            mark_job_cancelled(active_job["id"])
        else:
            return jsonify({
                "error": "A crawl job is already running for this website. You can cancel it or use 'Force Re-crawl'.",
                "job_id": active_job["id"],
                "status": active_job["status"],
            }), 409

    # --- Create job record and run crawl ---
    job_id = create_crawl_job(website_id)

    import threading
    thread = threading.Thread(
        target=run_crawl.run,
        args=(job_id, website_id, domain_clean, site_id),
        daemon=True,
    )
    thread.start()
    logger.info("Crawl job %s started in background for site_id=%s domain=%s", job_id, site_id, domain_clean)

    return jsonify({
        "job_id": job_id,
        "site_id": site_id,
        "status": "queued",
        "message": f"Crawl job queued for {db_domain}",
    }), 202


@crawl_bp.get("/crawl/<int:job_id>")
def get_job_status(job_id: int):
    """Return the current state of a crawl job."""
    job = get_crawl_job(job_id)
    if not job:
        return jsonify({"error": "Crawl job not found"}), 404
    return jsonify(job), 200


@crawl_bp.post("/crawl/<int:job_id>/stop")
def stop_crawl_job(job_id: int):
    """Manually stop/cancel an active crawl job."""
    from crawl_service.tasks.crawl_task import cancel_job
    cancel_job(job_id)
    mark_job_cancelled(job_id)

    # Immediately ensure site crawl_status is transitioned out of 'running'
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT website_id FROM crawl_jobs WHERE id = %s", (job_id,))
                row = cur.fetchone()
                if row:
                    cur.execute("SELECT site_id FROM websites WHERE id = %s", (row["website_id"],))
                    w_row = cur.fetchone()
                    if w_row and w_row["site_id"]:
                        cur.execute(
                            "UPDATE sites SET crawl_status = 'completed', last_crawled_at = NOW(), updated_at = NOW() WHERE id = %s",
                            (w_row["site_id"],)
                        )
    except Exception as e:
        logger.warning("Error updating site status on stop_crawl_job: %s", e)

    return jsonify({
        "job_id": job_id,
        "status": "cancelled",
        "message": f"Stop request recorded for crawl job {job_id}"
    }), 200
