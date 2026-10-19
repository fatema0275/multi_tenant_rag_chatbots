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
import uuid
import logging
from typing import Optional
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
                            # 1. Fetch distinct pages across the website (prioritizing host domain web pages over Google Drive PDFs)
                            cur.execute(
                                """
                                SELECT DISTINCT ON (clean_url) id, page_url, page_title, dom_selector, text_snippet, chunk_text
                                FROM (
                                    SELECT id, page_url, page_title, dom_selector, text_snippet, chunk_text,
                                           split_part(split_part(page_url, '?', 1), '#', 1) AS clean_url
                                    FROM document_chunks
                                    WHERE website_id = %s OR site_id = %s
                                ) sub
                                ORDER BY clean_url, (CASE WHEN dom_selector IS NOT NULL THEN 1 ELSE 2 END), id ASC
                                LIMIT 60
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
                                        "chunk_text": (r.get("chunk_text") or r.get("text_snippet") or "").strip(),
                                        "dom_selector": r.get("dom_selector"),
                                        "text_snippet": r.get("text_snippet"),
                                    })

                            # 2. Targeted lookup for query keywords in page_url or page_title
                            nav_query_tokens = [w for w in query_lower.split() if len(w) >= 3 and w not in ("where", "find", "take", "page", "link")]
                            for kw in nav_query_tokens[:3]:
                                cur.execute(
                                    """
                                    SELECT id, page_url, page_title, dom_selector, text_snippet, chunk_text
                                    FROM document_chunks
                                    WHERE (website_id = %s OR site_id = %s)
                                      AND (page_url ILIKE %s OR page_title ILIKE %s)
                                    LIMIT 5
                                    """,
                                    (row.get("website_id"), tenant_id, f"%{kw}%", f"%{kw}%"),
                                )
                                for r in cur.fetchall():
                                    p_url = (r.get("page_url") or "").strip()
                                    if p_url and not any(clean_page_cmp(c["page_url"]) == clean_page_cmp(p_url) for c in candidate_chunks):
                                        candidate_chunks.append({
                                            "chunk_id": r["id"],
                                            "page_url": p_url,
                                            "page_title": (r.get("page_title") or "").strip(),
                                            "chunk_text": (r.get("chunk_text") or r.get("text_snippet") or "").strip(),
                                            "dom_selector": r.get("dom_selector"),
                                            "text_snippet": r.get("text_snippet"),
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

                    is_website_page = bool(clean_host(p_url) == reg_host)
                    is_pdf_doc = p_url.lower().endswith(".pdf") or "drive.google.com" in p_url.lower()

                    if is_website_page:
                        score += 12
                    if "page" in query_lower and not is_pdf_doc:
                        score += 15

                    if p_url.lower() in answer_lower:
                        score += 15
                    elif path_slug and path_slug in answer_lower:
                        score += 10
                    elif last_seg and len(last_seg) > 2 and last_seg in answer_lower:
                        score += 8

                    if path_slug and path_slug in query_lower:
                        score += 15
                    elif last_seg and len(last_seg) > 2 and last_seg in query_lower:
                        score += 12

                    title_lower = (c.get("page_title") or "").lower()
                    if title_lower and title_lower in answer_lower:
                        score += 8
                    if title_lower and title_lower in query_lower:
                        score += 8

                    if any(s.get("chunk_id") == c.get("chunk_id") for s in raw_sources):
                        score += 6

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
                    parsed = urlparse(p_url)
                    seg = parsed.path.strip("/").split("/")[-1]
                    seg_label = seg.replace("-", " ").replace("_", " ").title() if seg else ""

                    if seg_label and (not title or "novatech" in title.lower() or "solution" in title.lower() or seg_label.lower() in ("services", "resources", "about", "contact", "pricing")):
                        label = f"{seg_label} Page" if seg_label.lower() in ("services", "resources", "pricing") else seg_label
                    elif title:
                        label = title.split(" | ")[0].split(" - ")[0].strip() or title
                    else:
                        label = "Visit Page"

                    nav_links.append({
                        "label": label,
                        "url": p_url,
                        "dom_selector": c.get("dom_selector"),
                        "text_snippet": c.get("text_snippet")
                    })
                    if len(nav_links) >= 3:
                        break

            message_id = data.get("message_id") or data.get("messageId")
            if not message_id:
                # If backend didn't return message_id, generate one
                message_id = str(uuid.uuid4())

            return jsonify({
                "response": data.get("answer", "No answer generated."),
                "verified": data.get("verified", False),
                "sources": enriched_sources,
                "nav_links": nav_links,
                "session_token": session_token,
                "message_id": message_id,
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


def _to_uuid_str(val) -> Optional[str]:
    """Convert integer or string to valid UUID format."""
    if not val:
        return None
    s = str(val).strip()
    try:
        return str(uuid.UUID(s))
    except Exception:
        try:
            return str(uuid.UUID(int=int(s)))
        except Exception:
            return str(uuid.uuid5(uuid.NAMESPACE_DNS, s))


def _to_chunk_int(val) -> Optional[int]:
    """Parse chunk id to integer if possible."""
    try:
        return int(val)
    except Exception:
        try:
            u = uuid.UUID(str(val))
            if u.int < 2147483647:
                return u.int
        except Exception:
            pass
        return None


@widget_bp.post("/api/widget/feedback")
def submit_widget_feedback():
    """
    POST /api/widget/feedback — Public endpoint authenticated only by embed_token.
    Accepts: token (embed_token), message_id, rating ('up' or 'down'), session_token.
    Applies real-time weight adjustment to document_chunks and clusters into feedback_examples.
    Rate limit: 10 requests per minute per IP via Flask-Limiter.
    """
    body = request.get_json(silent=True) or {}
    token = body.get("token") or request.args.get("token")
    message_id_raw = body.get("message_id")
    rating = (body.get("rating") or "").strip().lower()
    session_token = body.get("session_token")

    if not token:
        return jsonify({"error": "token is required"}), 400

    if not message_id_raw:
        return jsonify({"error": "message_id is required"}), 400

    if rating not in ("up", "down"):
        return jsonify({"error": "rating must be either 'up' or 'down'"}), 400

    # 1. Resolve embed_token to website_id and site_id
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.website_id, w.site_id, w.domain
                FROM chatbot_configs c
                JOIN websites w ON c.website_id = w.id
                WHERE c.embed_token = %s AND c.is_active = true
                """,
                (token,),
            )
            config_row = cur.fetchone()

    if not config_row:
        return jsonify({"error": "Invalid or inactive widget token"}), 404

    website_id = config_row.get("website_id")
    site_id = config_row.get("site_id")

    # 2. Fetch the query_logs row for this message_id
    message_uuid = _to_uuid_str(message_id_raw)
    query_log = None
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, tenant_id, session_id, query_text, retrieved_chunk_ids,
                       similarity_scores, generated_answer, query_embedding
                FROM query_logs
                WHERE id = %s
                """,
                (message_uuid,),
            )
            query_log = cur.fetchone()

            # If not found by UUID directly, check if message_id was stored as string or session
            if not query_log and session_token:
                cur.execute(
                    """
                    SELECT id, tenant_id, session_id, query_text, retrieved_chunk_ids,
                           similarity_scores, generated_answer, query_embedding
                    FROM query_logs
                    WHERE session_id = %s
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (str(session_token),),
                )
                query_log = cur.fetchone()

    if not query_log:
        return jsonify({"error": "Message or query log not found"}), 404

    # Prevent cross-site feedback injection
    # Verify that query_log tenant_id matches site_id or website_id
    q_tenant = str(query_log.get("tenant_id") or "")
    if site_id and q_tenant and q_tenant != str(site_id):
        logger.warning(f"Cross-site feedback injection blocked: q_tenant={q_tenant} != site_id={site_id}")
        return jsonify({"error": "Forbidden: cross-site feedback injection rejected"}), 403

    effective_message_id = query_log["id"]
    retrieved_chunk_ids_raw = query_log.get("retrieved_chunk_ids") or []
    similarity_scores = query_log.get("similarity_scores") or []
    query_text = query_log.get("query_text") or "Representative query"
    generated_answer = query_log.get("generated_answer") or ""

    # Parse and extract chunk IDs
    int_chunk_ids = []
    uuid_chunk_ids = []
    for c in retrieved_chunk_ids_raw:
        ci = _to_chunk_int(c)
        if ci is not None:
            int_chunk_ids.append(ci)
        cu = _to_uuid_str(c)
        if cu:
            uuid_chunk_ids.append(cu)

    # 3. Identify top_chunk_ids as the three chunk ids with highest similarity scores
    paired_chunks = []
    for idx, c in enumerate(retrieved_chunk_ids_raw):
        score = similarity_scores[idx] if idx < len(similarity_scores) else 0.0
        paired_chunks.append((c, float(score or 0.0)))
    paired_chunks.sort(key=lambda x: x[1], reverse=True)

    top_raw_ids = [p[0] for p in paired_chunks[:3]]
    top_int_ids = [_to_chunk_int(c) for c in top_raw_ids if _to_chunk_int(c) is not None]
    top_uuid_ids = [_to_uuid_str(c) for c in top_raw_ids if _to_uuid_str(c) is not None]

    # Ensure query_embedding is present (384-dimensional vector)
    query_embedding = query_log.get("query_embedding")
    emb_str = None
    if query_embedding:
        # pgvector format string or list
        if isinstance(query_embedding, str):
            emb_str = query_embedding
        elif isinstance(query_embedding, (list, tuple)):
            emb_str = f"[{','.join(str(float(x)) for x in query_embedding)}]"
    else:
        # Fetch embedding on the fly via embedding service
        try:
            import requests
            embed_url = os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:5001")
            res_emb = requests.post(f"{embed_url}/embed", json={"texts": [query_text]}, timeout=10)
            if res_emb.status_code == 200:
                data_emb = res_emb.json()
                emb_list = data_emb.get("embeddings", [[]])[0]
                if emb_list:
                    emb_str = f"[{','.join(str(float(x)) for x in emb_list)}]"
        except Exception as emb_err:
            logger.warning(f"Could not generate embedding for feedback: {emb_err}")

    # 4. Apply weight adjustments immediately within tenant site_id
    with get_db() as conn:
        with conn.cursor() as cur:
            if rating == "down":
                # Thumbs down: multiply feedback_weight by 0.85 for all retrieved_chunk_ids
                if int_chunk_ids:
                    cur.execute(
                        """
                        UPDATE document_chunks
                        SET feedback_weight = GREATEST(0.1, feedback_weight * 0.85)
                        WHERE id = ANY(%s) AND site_id = %s
                        """,
                        (int_chunk_ids, site_id),
                    )
                # Stronger penalty for top_chunk_ids: multiply by 0.80
                if top_int_ids:
                    cur.execute(
                        """
                        UPDATE document_chunks
                        SET feedback_weight = GREATEST(0.1, feedback_weight * 0.80)
                        WHERE id = ANY(%s) AND site_id = %s
                        """,
                        (top_int_ids, site_id),
                    )
            elif rating == "up":
                # Thumbs up: multiply feedback_weight by 1.10 for all retrieved_chunk_ids (cap 3.0)
                if int_chunk_ids:
                    cur.execute(
                        """
                        UPDATE document_chunks
                        SET feedback_weight = LEAST(3.0, feedback_weight * 1.10)
                        WHERE id = ANY(%s) AND site_id = %s
                        """,
                        (int_chunk_ids, site_id),
                    )
                # Stronger reward for top_chunk_ids: multiply by 1.15
                if top_int_ids:
                    cur.execute(
                        """
                        UPDATE document_chunks
                        SET feedback_weight = LEAST(3.0, feedback_weight * 1.15)
                        WHERE id = ANY(%s) AND site_id = %s
                        """,
                        (top_int_ids, site_id),
                    )

            # 5. Upsert into feedback_examples
            if emb_str and site_id:
                cur.execute(
                    """
                    SELECT id, example_count
                    FROM feedback_examples
                    WHERE site_id = %s
                      AND (query_embedding <=> %s::vector) <= 0.15
                    ORDER BY (query_embedding <=> %s::vector) ASC
                    LIMIT 1
                    """,
                    (site_id, emb_str, emb_str),
                )
                existing_example = cur.fetchone()
                if existing_example:
                    cur.execute(
                        """
                        UPDATE feedback_examples
                        SET example_count = example_count + 1,
                            last_seen = NOW(),
                            rating = %s
                        WHERE id = %s
                        """,
                        (rating, existing_example["id"]),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO feedback_examples (
                            id, site_id, query_embedding, rating, representative_query,
                            example_count, last_seen, created_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s::vector, %s, %s,
                            1, NOW(), NOW()
                        )
                        """,
                        (site_id, emb_str, rating, query_text),
                    )

            # 6. Ensure message & chat_session exist for FK integrity
            cur.execute(
                """
                INSERT INTO messages (id, role, content, created_at)
                VALUES (%s, 'assistant', %s, NOW())
                ON CONFLICT (id) DO NOTHING
                """,
                (effective_message_id, generated_answer or "Assistant response"),
            )

            resolved_session_uuid = None
            if session_token:
                resolved_session_uuid = _to_uuid_str(session_token)
                cur.execute(
                    """
                    INSERT INTO chat_sessions (id, session_token, website_id, site_id, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (resolved_session_uuid, str(session_token), website_id, site_id),
                )

            # 7. Insert into feedback table
            cur.execute(
                """
                INSERT INTO feedback (
                    id, message_id, session_id, website_id, site_id, rating,
                    retrieved_chunk_ids, top_chunk_ids, query_embedding, created_at
                ) VALUES (
                    gen_random_uuid(), %s, %s, %s, %s, %s,
                    %s, %s, CASE WHEN %s IS NOT NULL THEN %s::vector ELSE NULL END, NOW()
                )
                ON CONFLICT (message_id) DO UPDATE
                SET rating = EXCLUDED.rating,
                    retrieved_chunk_ids = EXCLUDED.retrieved_chunk_ids,
                    top_chunk_ids = EXCLUDED.top_chunk_ids
                """,
                (
                    effective_message_id,
                    resolved_session_uuid,
                    website_id,
                    site_id,
                    rating,
                    uuid_chunk_ids,
                    top_uuid_ids,
                    emb_str,
                    emb_str,
                ),
            )

            # Keep query_logs in sync with embedding if not stored earlier
            if emb_str:
                cur.execute(
                    """
                    UPDATE query_logs
                    SET query_embedding = %s::vector
                    WHERE id = %s AND query_embedding IS NULL
                    """,
                    (emb_str, effective_message_id),
                )

    return jsonify({"success": True, "message": "Thank you for your feedback"}), 200


@widget_bp.post("/api/internal/decay-weights")
def decay_weights():
    """
    POST /api/internal/decay-weights — Weight Decay Job.
    Protected by INTERNAL_SECRET header.
    Runs weekly decay formula:
      feedback_weight = feedback_weight + (1.0 - feedback_weight) * 0.10
    Moves every chunk's weight 10% closer to 1.0 regardless of direction.
    Logs run in weight_decay_log.
    """
    internal_secret = os.getenv("INTERNAL_SECRET", "sitemind-internal-decay-secret-2026")
    provided_secret = request.headers.get("INTERNAL_SECRET") or request.headers.get("X-Internal-Secret")

    if not provided_secret or provided_secret != internal_secret:
        return jsonify({"error": "Unauthorized: invalid or missing INTERNAL_SECRET header"}), 401

    with get_db() as conn:
        with conn.cursor() as cur:
            # Run weight decay
            cur.execute(
                """
                UPDATE document_chunks
                SET feedback_weight = feedback_weight + (1.0 - feedback_weight) * 0.10
                WHERE feedback_weight != 1.0
                """
            )
            chunks_updated = cur.rowcount

            # Count distinct sites affected
            cur.execute(
                """
                SELECT COUNT(DISTINCT site_id)::int as count
                FROM document_chunks
                WHERE site_id IS NOT NULL AND feedback_weight != 1.0
                """
            )
            sites_row = cur.fetchone()
            sites_affected = (sites_row["count"] if sites_row else 0) or 0

            # Insert audit log into weight_decay_log
            cur.execute(
                """
                INSERT INTO weight_decay_log (id, run_at, chunks_updated, sites_affected)
                VALUES (gen_random_uuid(), NOW(), %s, %s)
                RETURNING id, run_at
                """,
                (chunks_updated, sites_affected),
            )
            log_row = cur.fetchone()

    logger.info(
        f"[WeightDecay] Decayed {chunks_updated} chunks across {sites_affected} sites (log_id={log_row['id'] if log_row else 'none'})"
    )

    return jsonify({
        "success": True,
        "message": "Feedback weights decayed successfully by 10% toward 1.0",
        "chunks_updated": chunks_updated,
        "sites_affected": sites_affected,
        "log_id": str(log_row["id"]) if log_row else None,
    }), 200

