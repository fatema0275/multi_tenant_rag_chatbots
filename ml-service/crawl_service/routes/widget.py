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


_TOKEN_CACHE = {}
_CACHE_TTL = 300  # 5 minutes

import time


@widget_bp.post("/api/widget/query")
def public_widget_query():
    body = request.get_json(silent=True) or {}
    token = body.get("token") or request.args.get("token")
    message = body.get("message", "").strip() or body.get("query", "").strip()
    session_token = body.get("session_token") or body.get("session_id")
    current_page = (body.get("current_url") or request.headers.get("Referer") or "").strip()

    if not token:
        return jsonify({"error": "token is required"}), 400

    if not message:
        return jsonify({"error": "message is required"}), 400

    import uuid
    if not session_token:
        session_token = str(uuid.uuid4())

    # Fast in-memory cache check
    now = time.time()
    cached = _TOKEN_CACHE.get(token)
    if cached and (now - cached["timestamp"]) < _CACHE_TTL:
        row = cached["data"]
    else:
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
        if row:
            _TOKEN_CACHE[token] = {"data": row, "timestamp": now}

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
            json={"query": message, "session_id": session_token},
            timeout=45
        )
        if res.status_code == 200:
            data = res.json()
            raw_sources = data.get("sources", [])
            answer_text = (data.get("answer") or "").strip()
            answer_lower = answer_text.lower()
            query_lower = message.lower()

            # Enrich sources with dom_selector and text_snippet from document_chunks
            chunk_ids = [s.get("chunk_id") for s in raw_sources if s.get("chunk_id") is not None]
            chunk_map = {}
            if chunk_ids:
                with get_db() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            SELECT id, page_url, page_title, dom_selector, text_snippet, chunk_text
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

            def clean_page_cmp(u: str) -> str:
                if not u:
                    return ""
                return u.split("?")[0].split("#")[0].rstrip("/").lower()

            reg_host = clean_host(registered_domain)
            seen_page_urls = set()
            enriched_sources = []

            for s in raw_sources:
                cid = s.get("chunk_id")
                chunk_info = chunk_map.get(cid, {})
                page_url = (chunk_info.get("page_url") or s.get("page_url") or "").strip()
                page_title = chunk_info.get("page_title") or s.get("page_title") or "Source"
                dom_selector = chunk_info.get("dom_selector") or s.get("dom_selector")
                text_snippet = chunk_info.get("text_snippet") or s.get("text_snippet")

                if not page_url:
                    continue

                # Normalize URL for deduplication
                norm_url = clean_page_cmp(page_url)
                if not norm_url or norm_url in seen_page_urls:
                    continue
                seen_page_urls.add(norm_url)

                # Check if page_url domain matches website's registered domain
                page_host = clean_host(page_url)
                domain_matches = bool(
                    page_host and reg_host and (page_host == reg_host or page_host.endswith("." + reg_host))
                )

                # Only include dom_selector when domains match
                effective_dom_selector = dom_selector if domain_matches else None

                enriched_sources.append({
                    "chunk_id": cid,
                    "similarity": s.get("similarity"),
                    "page_url": page_url,
                    "page_title": page_title,
                    "dom_selector": effective_dom_selector,
                    "text_snippet": text_snippet,
                })

                if len(enriched_sources) >= 2:
                    break

            # -------------------------------------------------------------
            # BUG 3 Navigation links detection and extraction
            # -------------------------------------------------------------
            nav_phrases = ["you can find", "visit", "navigate to", "go to", "click", "the page is"]
            has_nav_phrase = any(phrase in answer_lower for phrase in nav_phrases)
            is_nav_query = any(q in query_lower for q in ["take me to", "where is", "where can i find", "navigate to", "go to", "link to", "how do i get to"])
            has_nav_intent = has_nav_phrase or is_nav_query

            candidate_chunks = []
            for s in raw_sources:
                cid = s.get("chunk_id")
                info = chunk_map.get(cid, {})
                p_url = (info.get("page_url") or s.get("page_url") or "").strip()
                p_title = (info.get("page_title") or s.get("page_title") or "").strip()
                c_text = (info.get("chunk_text") or info.get("text_snippet") or "").strip()
                if p_url:
                    candidate_chunks.append({
                        "chunk_id": cid,
                        "page_url": p_url,
                        "page_title": p_title,
                        "chunk_text": c_text
                    })

            if has_nav_intent:
                try:
                    with get_db() as conn:
                        with conn.cursor() as cur:
                            cur.execute(
                                """
                                SELECT id, page_url, page_title, dom_selector, text_snippet, chunk_text
                                FROM document_chunks
                                WHERE website_id = %s OR site_id = %s
                                ORDER BY id ASC LIMIT 25
                                """,
                                (row.get("website_id"), tenant_id),
                            )
                            for r in cur.fetchall():
                                p_url = (r.get("page_url") or "").strip()
                                if p_url and not any(clean_page_cmp(c["page_url"]) == clean_page_cmp(p_url) for c in candidate_chunks):
                                    candidate_chunks.append({
                                        "chunk_id": r["id"],
                                        "page_url": p_url,
                                        "page_title": (r.get("page_title") or "").strip(),
                                        "chunk_text": (r.get("chunk_text") or r.get("text_snippet") or "").strip()
                                    })
                except Exception as db_err:
                    logger.warning(f"Error fetching extra candidate chunks for navigation: {db_err}")

            norm_current_page = clean_page_cmp(current_page)
            different_page_chunks = [
                c for c in candidate_chunks
                if c.get("page_url") and (not norm_current_page or clean_page_cmp(c["page_url"]) != norm_current_page)
            ]

            nav_links = []
            if has_nav_intent and different_page_chunks:
                scored_chunks = []
                seen_nav_urls = set()

                for c in different_page_chunks:
                    p_url = c["page_url"]
                    norm_url = clean_page_cmp(p_url)
                    if not norm_url or norm_url in seen_nav_urls:
                        continue

                    score = 0
                    parsed = urlparse(p_url)
                    path_slug = parsed.path.strip("/").lower()
                    last_seg = path_slug.split("/")[-1] if path_slug else ""

                    if p_url.lower() in answer_lower:
                        score += 15
                    elif path_slug and path_slug in answer_lower:
                        score += 10
                    elif last_seg and len(last_seg) > 2 and last_seg in answer_lower:
                        score += 8

                    if path_slug and path_slug in query_lower:
                        score += 7
                    elif last_seg and len(last_seg) > 2 and last_seg in query_lower:
                        score += 5

                    title_lower = (c.get("page_title") or "").lower()
                    if title_lower and title_lower in answer_lower:
                        score += 6
                    if title_lower and title_lower in query_lower:
                        score += 5

                    if any(s.get("chunk_id") == c.get("chunk_id") for s in raw_sources):
                        score += 4

                    chunk_text_lower = (c.get("chunk_text") or "").lower()
                    if query_lower and any(kw in chunk_text_lower for kw in query_lower.split() if len(kw) > 3):
                        score += 2

                    scored_chunks.append((score, c))

                scored_chunks.sort(key=lambda x: x[0], reverse=True)

                for score, c in scored_chunks:
                    p_url = c["page_url"]
                    norm_url = clean_page_cmp(p_url)
                    if norm_url in seen_nav_urls:
                        continue
                    seen_nav_urls.add(norm_url)

                    title = (c.get("page_title") or "").strip()
                    if title:
                        label = title.split(" | ")[0].split(" - ")[0].strip() or title
                    else:
                        parsed = urlparse(p_url)
                        seg = parsed.path.strip("/").split("/")[-1]
                        label = seg.replace("-", " ").replace("_", " ").title() if seg else "Visit Page"

                    nav_links.append({
                        "label": label,
                        "url": p_url
                    })
                    if len(nav_links) >= 3:
                        break

            return jsonify({
                "response": data.get("answer", "No answer generated."),
                "verified": data.get("verified", False),
                "sources": enriched_sources,
                "nav_links": nav_links,
                "session_token": session_token,
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
