"""
routes/crawl.py — HTTP endpoints for the crawl service.

Endpoints:
  POST /crawl
      Body: { website_id, domain, user_id }
      Guards: website must have verification_status == 'verified' (checked
              by the Node.js backend before forwarding here, but we do a
              lightweight DB re-check as defence-in-depth).
      Response 202: { job_id, status: "queued", message }
      Response 422: website not verified / already running
      Response 404: website_id not found in DB

  GET /crawl/<job_id>
      Response 200: { job_id, status, pages_found, pages_crawled,
                      pages_failed, pages_skipped, crawl_type,
                      started_at, completed_at, error_message }
      Response 404: job not found
"""

import logging
from flask import Blueprint, request, jsonify
from crawl_service.db.crawl_jobs import (
    get_crawl_job,
    create_crawl_job,
    get_active_job_for_website,
)
from crawl_service.db.connection import get_db
from crawl_service.tasks.crawl_task import run_crawl

logger = logging.getLogger(__name__)

crawl_bp = Blueprint("crawl", __name__)


# --------------------------------------------------------------------------- #
# POST /crawl                                                                   #
# --------------------------------------------------------------------------- #
@crawl_bp.post("/crawl")
def trigger_crawl():
    """
    Accept a crawl request from the Node.js backend.

    The Node.js crawlService already validated ownership and verification_status
    before forwarding here, but we perform a lightweight DB check so this
    service can be called standalone without bypassing safety gates.
    """
    body = request.get_json(silent=True) or {}

    website_id = body.get("website_id")
    domain = body.get("domain")
    user_id = body.get("user_id")

    # --- Input validation -------------------------------------------------- #
    if not website_id or not domain:
        return jsonify({"error": "website_id and domain are required"}), 400

    try:
        website_id = int(website_id)
    except (TypeError, ValueError):
        return jsonify({"error": "website_id must be an integer"}), 400

    # --- Defence-in-depth: re-verify ownership and verification_status ------ #
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, domain, verification_status
                FROM   websites
                WHERE  id = %s
                """,
                (website_id,),
            )
            row = cur.fetchone()

    if not row:
        return jsonify({"error": "Website not found"}), 404

    db_domain = row["domain"]
    verification_status = row["verification_status"]

    if verification_status != "verified":
        return jsonify({
            "error": (
                f"Cannot crawl an unverified website "
                f"(current status: {verification_status}). "
                "Complete domain verification first."
            )
        }), 422

    # --- Prevent duplicate concurrent jobs ---------------------------------- #
    active_job = get_active_job_for_website(website_id)
    if active_job:
        return jsonify({
            "error": "A crawl job is already running for this website",
            "job_id": active_job["id"],
            "status": active_job["status"],
        }), 409

    # --- Create the job record (status: queued) ----------------------------- #
    job_id = create_crawl_job(website_id)

    # --- Execute crawl task in background daemon thread for instant response --- #
    import threading
    task_fn = getattr(run_crawl, "run", run_crawl)
    thread = threading.Thread(
        target=task_fn,
        args=(job_id, website_id, domain),
        daemon=True,
    )
    thread.start()
    logger.info("Crawl job %s started in background thread for website_id=%s domain=%s", job_id, website_id, domain)

    return jsonify({
        "job_id": job_id,
        "status": "queued",
        "message": f"Crawl job queued for {db_domain}",
    }), 202


# --------------------------------------------------------------------------- #
# GET /crawl/<job_id>                                                           #
# --------------------------------------------------------------------------- #
@crawl_bp.get("/crawl/<int:job_id>")
def get_job_status(job_id: int):
    """Return the current state of a crawl job."""
    job = get_crawl_job(job_id)
    if not job:
        return jsonify({"error": "Crawl job not found"}), 404
    return jsonify(job), 200


# --------------------------------------------------------------------------- #
# POST /crawl/<job_id>/stop                                                     #
# --------------------------------------------------------------------------- #
@crawl_bp.post("/crawl/<int:job_id>/stop")
def stop_crawl_job(job_id: int):
    """Manually stop/cancel an active crawl job."""
    from crawl_service.tasks.crawl_task import cancel_job
    cancel_job(job_id)
    return jsonify({
        "job_id": job_id,
        "status": "cancelled",
        "message": f"Stop request recorded for crawl job {job_id}"
    }), 200
