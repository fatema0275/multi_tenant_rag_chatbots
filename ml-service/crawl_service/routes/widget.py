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

import os
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
    message = body.get("message", "").strip() or body.get("query", "").strip()

    if not token:
        return jsonify({"error": "token is required"}), 400

    if not message:
        return jsonify({"error": "message is required"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id as config_id, c.website_id, w.site_id, w.domain
                FROM chatbot_configs c
                JOIN websites w ON c.website_id = w.id
                WHERE c.embed_token = %s AND c.is_active = true
                """,
                (token,),
            )
            row = cur.fetchone()

    if not row:
        return jsonify({"error": "Invalid or inactive widget token"}), 404

    tenant_id = row.get("site_id") or row.get("website_id")
    registered_domain = (row.get("domain") or "").strip()
    backend_url = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:5000")
    chat_endpoint = f"{backend_url}/api/chat/{tenant_id}"

    try:
        import requests
        from urllib.parse import urlparse

        res = requests.post(
            chat_endpoint,
            json={"query": message},
            timeout=25
        )
        if res.status_code == 200:
            data = res.json()
            raw_sources = data.get("sources", [])

            # Enrich sources with dom_selector and text_snippet from document_chunks
            chunk_ids = [s.get("chunk_id") for s in raw_sources if s.get("chunk_id") is not None]
            chunk_map = {}
            if chunk_ids:
                with get_db() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            SELECT id, page_url, page_title, dom_selector, text_snippet
                            FROM document_chunks
                            WHERE id = ANY(%s)
                            """,
                            (chunk_ids,),
                        )
                        for r in cur.fetchall():
                            chunk_map[r["id"]] = r

            def clean_host(host_or_url: str) -> str:
                if not host_or_url:
                    return ""
                h = host_or_url.strip().lower()
                if not h.startswith("http://") and not h.startswith("https://"):
                    h = "http://" + h
                try:
                    netloc = urlparse(h).netloc.split(":")[0]
                    if netloc.startswith("www."):
                        netloc = netloc[4:]
                    return netloc
                except Exception:
                    return ""

            reg_host = clean_host(registered_domain)
            seen_page_urls = set()
            enriched_sources = []

            for s in raw_sources:
                cid = s.get("chunk_id")
                chunk_info = chunk_map.get(cid, {})
                page_url = chunk_info.get("page_url") or s.get("page_url") or ""
                page_title = chunk_info.get("page_title") or s.get("page_title") or "Source"
                dom_selector = chunk_info.get("dom_selector") or s.get("dom_selector")
                text_snippet = chunk_info.get("text_snippet") or s.get("text_snippet")

                # Normalize URL for deduplication
                norm_url = page_url.split("?")[0].split("#")[0].rstrip("/").lower() if page_url else ""
                is_top_for_page = False
                if norm_url and norm_url not in seen_page_urls:
                    seen_page_urls.add(norm_url)
                    is_top_for_page = True

                # Check if page_url domain matches website's registered domain
                page_host = clean_host(page_url)
                domain_matches = bool(
                    page_host and reg_host and (page_host == reg_host or page_host.endswith("." + reg_host))
                )

                # Only include dom_selector for top retrieved chunk per unique page_url when domains match
                effective_dom_selector = dom_selector if (is_top_for_page and domain_matches) else None

                enriched_sources.append({
                    "chunk_id": cid,
                    "similarity": s.get("similarity"),
                    "page_url": page_url,
                    "page_title": page_title,
                    "dom_selector": effective_dom_selector,
                    "text_snippet": text_snippet,
                })

            return jsonify({
                "response": data.get("answer", "No answer generated."),
                "verified": data.get("verified", False),
                "sources": enriched_sources,
                "status": "ok",
            }), 200
        else:
            err_data = res.json() if "application/json" in res.headers.get("content-type", "") else {}
            return jsonify({
                "error": err_data.get("error") or f"RAG processing error ({res.status_code})"
            }), res.status_code
    except Exception as e:
        logger.error(f"Error calling RAG chat pipeline: {e}")
        return jsonify({"error": f"Failed to connect to RAG processing engine: {str(e)}"}), 502
