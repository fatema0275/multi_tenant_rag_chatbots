"""
routes/chatbot.py — Flask REST API endpoints for Chatbot Configuration & Deployment.

Endpoints:
  POST /api/chatbot/generate
      Body: { website_id }
      JWT Auth required.
      Validates crawl_status == 'completed' on linked sites table.
      Runs branding extractor.
      Upserts row in chatbot_configs (preserves theme_color & background_color if overrides_locked == true).

  GET /api/chatbot/config/<int:website_id>
      JWT Auth required.
      Fetches existing chatbot_configs row for website_id.

  PATCH /api/chatbot/config/<int:website_id>
      JWT Auth required.
      Updates theme_color, background_color, text_color, widget_settings.
      Sets overrides_locked = true.
"""

import os
import uuid
import logging
from functools import wraps
from typing import Optional, Tuple

import jwt
from flask import Blueprint, request, jsonify
from crawl_service.db.connection import get_db
from crawl_service.branding.extractor import extract_branding

logger = logging.getLogger(__name__)

chatbot_bp = Blueprint("chatbot", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "sitemind-dev-secret-2026")


def require_jwt_auth(f):
    """Decorator verifying Bearer JWT token and attaching g.user_id."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication token missing or malformed"}), 401
        
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("userId")
            if not user_id:
                return jsonify({"error": "Invalid token payload"}), 401
            request.user_id = int(user_id)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please log in again."}), 401
        except Exception as err:
            logger.warning("JWT verification failed: %s", err)
            return jsonify({"error": "Invalid authentication token"}), 401
        
        return f(*args, **kwargs)
    return decorated


def _verify_website_ownership(website_id: int, user_id: int) -> Tuple[Optional[dict], Optional[str]]:
    """
    Verify user owns website_id and return (website_row, error_message).
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT w.id, w.user_id, w.domain, w.site_id, s.crawl_status
                FROM   websites w
                LEFT JOIN sites s ON w.site_id = s.id
                WHERE  w.id = %s AND w.user_id = %s
                """,
                (website_id, user_id),
            )
            row = cur.fetchone()

    if not row:
        return None, "Website not found or unauthorized"
    
    return dict(row), None


@chatbot_bp.post("/api/chatbot/generate")
@require_jwt_auth
def generate_chatbot():
    body = request.get_json(silent=True) or {}
    website_id = body.get("website_id")

    if not website_id:
        return jsonify({"error": "website_id is required"}), 400

    try:
        website_id = int(website_id)
    except (TypeError, ValueError):
        return jsonify({"error": "website_id must be an integer"}), 400

    website, err_msg = _verify_website_ownership(website_id, request.user_id)
    if err_msg:
        return jsonify({"error": err_msg}), 403

    crawl_status = website.get("crawl_status")
    site_id = website.get("site_id")

    # If not completed, verify if site already has indexed chunks/pages in database
    if crawl_status != "completed":
        chunk_count = 0
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) AS cnt FROM document_chunks WHERE site_id = %s OR website_id = %s",
                    (site_id, website_id),
                )
                r = cur.fetchone()
                if r:
                    chunk_count = r["cnt"]
        if chunk_count == 0:
            return jsonify({
                "error": f"Cannot generate chatbot configuration: no knowledge base content has been indexed yet (current status: {crawl_status or 'pending'}). Please run a crawl first."
            }), 422
        # Auto-heal crawl_status on sites table
        if site_id:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE sites SET crawl_status = 'completed', updated_at = NOW() WHERE id = %s", (site_id,))

    domain = website["domain"]
    
    # Run branding extraction
    branding = extract_branding(domain)
    extracted_theme = branding["theme_color"]
    extracted_logo = branding["logo_url"]

    # Check if config row already exists
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, theme_color, background_color, text_color, logo_url, widget_settings, embed_token, overrides_locked
                FROM   chatbot_configs
                WHERE  website_id = %s
                """,
                (website_id,),
            )
            existing = cur.fetchone()

            if existing:
                existing = dict(existing)
                overrides_locked = existing.get("overrides_locked", False)
                embed_token = existing["embed_token"]

                if overrides_locked:
                    # Preserve existing manual colors, only update logo_url and updated_at
                    cur.execute(
                        """
                        UPDATE chatbot_configs
                        SET    logo_url = %s, updated_at = NOW()
                        WHERE  website_id = %s
                        RETURNING *
                        """,
                        (extracted_logo, website_id),
                    )
                else:
                    # Update extracted branding colors & logo_url
                    cur.execute(
                        """
                        UPDATE chatbot_configs
                        SET    theme_color = %s, logo_url = %s, updated_at = NOW()
                        WHERE  website_id = %s
                        RETURNING *
                        """,
                        (extracted_theme, extracted_logo, website_id),
                    )
                updated_row = dict(cur.fetchone())
            else:
                embed_token = str(uuid.uuid4())
                cur.execute(
                    """
                    INSERT INTO chatbot_configs
                      (website_id, theme_color, background_color, text_color, logo_url, embed_token, overrides_locked, is_active)
                    VALUES
                      (%s, %s, '#ffffff', '#111111', %s, %s, false, true)
                    RETURNING *
                    """,
                    (website_id, extracted_theme, extracted_logo, embed_token),
                )
                updated_row = dict(cur.fetchone())

    return jsonify(updated_row), 200


@chatbot_bp.get("/api/chatbot/config/<int:website_id>")
@require_jwt_auth
def get_chatbot_config(website_id: int):
    website, err_msg = _verify_website_ownership(website_id, request.user_id)
    if err_msg:
        return jsonify({"error": err_msg}), 403

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, website_id, theme_color, background_color, text_color, logo_url,
                       widget_settings, embed_token, overrides_locked, is_active, created_at, updated_at
                FROM   chatbot_configs
                WHERE  website_id = %s
                """,
                (website_id,),
            )
            row = cur.fetchone()

    if not row:
        return jsonify({"exists": False, "message": "Chatbot configuration not found for this website"}), 200

    config_dict = dict(row)
    config_dict["exists"] = True
    return jsonify(config_dict), 200


@chatbot_bp.patch("/api/chatbot/config/<int:website_id>")
@require_jwt_auth
def update_chatbot_config(website_id: int):
    website, err_msg = _verify_website_ownership(website_id, request.user_id)
    if err_msg:
        return jsonify({"error": err_msg}), 403

    body = request.get_json(silent=True) or {}
    
    theme_color = body.get("theme_color")
    background_color = body.get("background_color")
    text_color = body.get("text_color")
    widget_settings = body.get("widget_settings")

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM chatbot_configs WHERE website_id = %s",
                (website_id,),
            )
            existing = cur.fetchone()
            if not existing:
                return jsonify({"error": "Chatbot configuration not found. Generate it first."}), 404

            updates = ["overrides_locked = true", "updated_at = NOW()"]
            params = []

            if theme_color is not None:
                updates.append("theme_color = %s")
                params.append(str(theme_color).strip())

            if background_color is not None:
                updates.append("background_color = %s")
                params.append(str(background_color).strip())

            if text_color is not None:
                updates.append("text_color = %s")
                params.append(str(text_color).strip())

            if widget_settings is not None:
                import json
                updates.append("widget_settings = %s::jsonb")
                params.append(json.dumps(widget_settings) if isinstance(widget_settings, dict) else str(widget_settings))

            params.append(website_id)

            query = f"""
                UPDATE chatbot_configs
                SET    {', '.join(updates)}
                WHERE  website_id = %s
                RETURNING *
            """
            cur.execute(query, tuple(params))
            updated = cur.fetchone()

    return jsonify(dict(updated)), 200
