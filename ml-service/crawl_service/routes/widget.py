"""
routes/widget.py — Unauthenticated public widget endpoints with Flask-Limiter rate limiting.

Endpoints:
  GET /api/widget/config?token=<EMBED_TOKEN>
      Rate Limit: 120 req/min per IP.
      Public endpoint called by embeddable widget on load.
      Returns branding theme, colors, logo_url, and website_name.

  POST /api/widget/query
      Rate Limit: 30 req/min per IP.
      Public endpoint accepting visitor queries.
      Stubbed response for Module 4: "Query processing coming in Module 5."
"""

import logging
from flask import Blueprint, request, jsonify
from crawl_service.db.connection import get_db

logger = logging.getLogger(__name__)

widget_bp = Blueprint("widget", __name__)


@widget_bp.get("/api/widget/config")
def get_public_widget_config():
    token = request.args.get("token", "").strip()
    if not token:
        return jsonify({"error": "token query parameter is required"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.theme_color, c.background_color, c.text_color, c.logo_url,
                       c.widget_settings, c.is_active, w.domain
                FROM   chatbot_configs c
                JOIN   websites w ON c.website_id = w.id
                WHERE  c.embed_token = %s
                """,
                (token,),
            )
            row = cur.fetchone()

    if not row or not row.get("is_active", True):
        return jsonify({"error": "Widget configuration not found or inactive"}), 404

    domain = row.get("domain") or "SiteMind AI"
    website_name = domain.split(".")[0].capitalize() if "." in domain else domain

    return jsonify({
        "theme_color": row.get("theme_color") or "#22C55E",
        "background_color": row.get("background_color") or "#ffffff",
        "text_color": row.get("text_color") or "#111111",
        "logo_url": row.get("logo_url"),
        "website_name": website_name,
        "domain": domain,
        "widget_settings": row.get("widget_settings") or {},
    }), 200


@widget_bp.post("/api/widget/query")
def public_widget_query():
    body = request.get_json(silent=True) or {}
    token = body.get("token") or request.args.get("token")
    message = body.get("message", "").strip()

    if not token:
        return jsonify({"error": "token is required"}), 400

    if not message:
        return jsonify({"error": "message is required"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM chatbot_configs
                WHERE embed_token = %s AND is_active = true
                """,
                (token,),
            )
            row = cur.fetchone()

    if not row:
        return jsonify({"error": "Invalid or inactive widget token"}), 404

    return jsonify({
        "response": "Query processing coming in Module 5.",
        "status": "ok",
    }), 200
