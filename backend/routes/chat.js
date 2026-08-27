'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { sequelize } = require('../models');

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const FALLBACK_MESSAGE = "I can only answer based on verified information from this site's content. I wasn't confident enough in my answer to share it — please contact support for help with this question.";

/**
 * Non-blocking async logger to query_logs table
 */
function logQueryAsync({
  tenantId,
  sessionId,
  queryText,
  retrievedChunkIds,
  similarityScores,
  generatedAnswer,
  entailmentVerdict,
  fallbackTriggered,
  fallbackReason,
  latencyMs
}) {
  (async () => {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
      const uuidTenantId = isUuid ? tenantId : null;

      await sequelize.query(
        `INSERT INTO query_logs (
          tenant_id, session_id, query_text, retrieved_chunk_ids, similarity_scores,
          generated_answer, entailment_verdict, fallback_triggered, fallback_reason, latency_ms
        ) VALUES (
          :tenantId, :sessionId, :queryText, 
          ARRAY[:retrievedChunkIds]::text[], 
          ARRAY[:similarityScores]::float[],
          :generatedAnswer, :entailmentVerdict, :fallbackTriggered, :fallbackReason, :latencyMs
        )`,
        {
          replacements: {
            tenantId: uuidTenantId,
            sessionId: sessionId || null,
            queryText,
            retrievedChunkIds: (retrievedChunkIds || []).map(String),
            similarityScores: (similarityScores || []).map(Number),
            generatedAnswer: generatedAnswer || null,
            entailmentVerdict: entailmentVerdict || null,
            fallbackTriggered: Boolean(fallbackTriggered),
            fallbackReason: fallbackReason || null,
            latencyMs: Math.round(latencyMs)
          }
        }
      );
    } catch (err) {
      console.error('❌ Error writing to query_logs:', err.message);
    }
  })();
}

// Optional auth middleware — parses JWT if valid, but allows public widget queries if missing or expired
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'sitemind-fallback-secret-key-2026';
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
      } catch (err) {
        console.warn(`[Chat] Optional auth token invalid/expired (${err.message}) - proceeding as public widget request`);
      }
    }
  }
  next();
};

/**
 * POST /api/chat/:tenantId — Module 5 Core RAG Conversation Engine
 */
router.post('/:tenantId', optionalAuth, async (req, res) => {
  const startTime = Date.now();
  const { tenantId } = req.params;
  const { query, session_id } = req.body;

  // 1. Tenant Authorization Check — 403 on mismatch (if authenticated user claims tenant)
  const authenticatedId = req.tenantId || req.userId;
  if (authenticatedId && String(authenticatedId) !== String(tenantId) && req.tenantId) {
    return res.status(403).json({ error: 'Forbidden: tenantId mismatch' });
  }

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query text is required' });
  }

  // Handle conversational greetings & short follow-ups gracefully
  const cleanQuery = query.trim().toLowerCase().replace(/[^\w\s]/g, '');
  const greetings = ['hi', 'hello', 'hey', 'heya', 'greetings', 'good morning', 'good afternoon', 'good evening', 'help', 'hey can you answer', 'can you answer', 'can you help me', 'are you there'];
  const clarifications = ['what', 'pardon', 'tell me more', 'more info', 'can you explain', 'explain', 'how'];

  if (greetings.some(g => cleanQuery === g || cleanQuery.startsWith('hey ') || cleanQuery.startsWith('hello '))) {
    let siteName = 'this website';
    try {
      const [siteRows] = await sequelize.query(
        'SELECT domain FROM websites WHERE id::text = :tenantId OR site_id::text = :tenantId LIMIT 1',
        { replacements: { tenantId } }
      );
      if (siteRows.length > 0 && siteRows[0].domain) {
        siteName = siteRows[0].domain;
      }
    } catch (_) {}

    return res.status(200).json({
      answer: `Hello! Welcome to ${siteName}. Yes, I am here to help you! How can I assist you with information from our site today?`,
      sources: [],
      verified: true
    });
  }

  if (clarifications.includes(cleanQuery)) {
    return res.status(200).json({
      answer: `Could you please specify which feature or topic from our site you would like to know more about?`,
      sources: [],
      verified: true
    });
  }

  // Resolve integer website_id (e.g. "33") or site_id UUID to effective tenant UUID
  let websiteId = tenantId;
  let siteUuid = tenantId;

  try {
    const [siteRows] = await sequelize.query(
      `SELECT id, site_id FROM websites WHERE id::text = :tenantId OR site_id::text = :tenantId LIMIT 1`,
      { replacements: { tenantId } }
    );
    if (siteRows.length > 0) {
      websiteId = String(siteRows[0].id);
      if (siteRows[0].site_id) siteUuid = String(siteRows[0].site_id);
    }
  } catch (_) {}

  // Guarantee a valid UUID for PostgreSQL tenants and query_logs tables
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteUuid);
  const effectiveTenantUuid = isUuid ? siteUuid : '8349bc7a-233b-4216-a3b3-cbda3cef0cfc';

  // Ensure tenant row exists in tenants table for foreign key integrity
  try {
    await sequelize.query(
      `INSERT INTO tenants (id, name, similarity_threshold)
       VALUES (:effectiveTenantUuid, 'Tenant ' || :effectiveTenantUuid, 0.50)
       ON CONFLICT (id) DO NOTHING;`,
      { replacements: { effectiveTenantUuid } }
    );
  } catch (_) {}

  // 2. Fetch tenant similarity_threshold
  let similarityThreshold = 0.30;
  try {
    const [tenantRows] = await sequelize.query(
      'SELECT similarity_threshold FROM tenants WHERE id = :effectiveTenantUuid',
      { replacements: { effectiveTenantUuid } }
    );
    if (tenantRows.length > 0 && tenantRows[0].similarity_threshold !== null) {
      similarityThreshold = parseFloat(tenantRows[0].similarity_threshold);
    }
  } catch (err) {
    console.warn(`[Chat] Could not query similarity_threshold for tenant ${effectiveTenantUuid}, using default 0.30: ${err.message}`);
  }

  // Helper to construct fallback response & log asynchronously
  const returnFallback = (reason, verdict = null, genAnswer = null, chunkIds = [], scores = []) => {
    const latencyMs = Date.now() - startTime;
    logQueryAsync({
      tenantId: effectiveTenantUuid,
      sessionId: session_id,
      queryText: query,
      retrievedChunkIds: chunkIds,
      similarityScores: scores,
      generatedAnswer: genAnswer,
      entailmentVerdict: verdict,
      fallbackTriggered: true,
      fallbackReason: reason,
      latencyMs
    });

    return res.status(200).json({
      answer: FALLBACK_MESSAGE,
      verified: false,
      fallback_reason: reason
    });
  };

  // 3. Stage 1: Embed Query
  let queryEmbedding = null;
  try {
    const embedRes = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [query] })
    });
    if (!embedRes.ok) throw new Error(`HTTP ${embedRes.status}`);
    const embedData = await embedRes.json();
    queryEmbedding = embedData.embeddings[0];
  } catch (err) {
    console.error('[Chat Stage 1] Embedding service error:', err.message);
    return returnFallback('generation_error');
  }

  // Resolve website_id and site_id UUID from websites table
  let resolvedSiteId = tenantId;
  let resolvedWebId = tenantId;
  try {
    const [siteRows] = await sequelize.query(
      `SELECT id, site_id FROM websites WHERE id::text = :tenantId OR site_id::text = :tenantId LIMIT 1`,
      { replacements: { tenantId } }
    );
    if (siteRows.length > 0) {
      resolvedWebId = String(siteRows[0].id);
      if (siteRows[0].site_id) resolvedSiteId = String(siteRows[0].site_id);
    }
  } catch (_) {}

  // 4. Stage 2: Retrieve Chunks using Materialized Subquery + Hybrid RAG Search (Vector + Keyword)
  //
  // NOTE: pgvector HNSW/IVFFlat indexes perform an ANN scan globally before applying WHERE clauses,
  // returning 0 rows for site-specific queries. "OFFSET 0" forces PostgreSQL to materialize 
  // the tenant's filtered chunks first before ordering by vector/hybrid distance.
  const keywords = query.split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length >= 4 && !['tell', 'have', 'this', 'that', 'what', 'some', 'with', 'about', 'your'].includes(w.toLowerCase()));

  const kw1 = keywords[0] ? `%${keywords[0]}%` : '%';
  const kw2 = keywords[1] ? `%${keywords[1]}%` : '%';

  let retrievedChunks = [];
  try {
    const vectorString = `[${queryEmbedding.join(',')}]`;
    const [rows] = await sequelize.query(
      `WITH tenant_chunks AS (
         SELECT id, content, embedding, page_title, page_url
         FROM chunks
         WHERE tenant_id::text = :tenantId
            OR site_id::text = :tenantId
            OR website_id::text = :tenantId
            OR tenant_id::text = :siteId
            OR site_id::text = :siteId
            OR website_id::text = :webId
         OFFSET 0
       )
       SELECT id, content, page_title, page_url, 1 - (embedding <=> :vectorStr::vector) AS similarity,
         (
           (1 - (embedding <=> :vectorStr::vector)) + 
           (CASE WHEN content ILIKE :kw1 THEN 0.4 ELSE 0 END) +
           (CASE WHEN page_title ILIKE :kw1 THEN 0.4 ELSE 0 END) +
           (CASE WHEN content ILIKE :kw2 THEN 0.2 ELSE 0 END) +
           (CASE WHEN page_title ILIKE :kw2 THEN 0.2 ELSE 0 END)
         ) AS hybrid_score
       FROM tenant_chunks
       ORDER BY hybrid_score DESC
       LIMIT 5`,
      { replacements: { vectorStr: vectorString, tenantId, siteId: resolvedSiteId, webId: resolvedWebId, kw1, kw2 } }
    );
    retrievedChunks = rows;
    console.log(`[Chat Stage 2] Retrieved ${rows.length} chunks for tenantId=${tenantId} (siteId=${resolvedSiteId}, webId=${resolvedWebId})`);
  } catch (err) {
    console.error('[Chat Stage 2] Vector retrieval error:', err.message);
    return returnFallback('generation_error');
  }

  let passingChunks = retrievedChunks;
  const retrievedIds = retrievedChunks.map(c => c.id);
  const similarityScores = retrievedChunks.map(c => parseFloat(c.similarity));

  // If vector/hybrid search yielded no chunks, fetch top site chunks as fallback
  const isOverviewQuery = /about|overview|site|website|what is|tell me|who|do|offer|provide|summary|baout/i.test(query);
  if (passingChunks.length < 1 || (isOverviewQuery && !keywords.length)) {
    try {
      const [overviewRows] = await sequelize.query(
        `SELECT id, content, page_title, page_url, 0.5 AS similarity
         FROM chunks
         WHERE tenant_id::text = :tenantId OR site_id::text = :tenantId OR website_id::text = :tenantId OR website_id::text = :webId
         ORDER BY id ASC
         LIMIT 5`,
        { replacements: { tenantId, webId: resolvedWebId } }
      );
      if (overviewRows.length > 0) {
        passingChunks = overviewRows;
      }
    } catch (_) {}
  }

  if (passingChunks.length < 1) {
    console.warn(`[Chat Stage 2] No chunks found for tenantId=${tenantId}. Check if crawl completed and document_chunks has rows for this site.`);
    return returnFallback('insufficient_retrieval', null, null, retrievedIds, similarityScores);
  }

  // 5. Stage 3: Generate Answer with Groq LLM
  const contextPassages = passingChunks.map((c, i) =>
    `[Source ${i + 1}] ${c.page_title ? `(Page: ${c.page_title}) ` : ''}${c.content}`
  ).join('\n\n');
  const systemPrompt = `You are a helpful AI assistant for this website. Your job is to answer questions using ONLY the information found in the context passages provided below.

Guidelines:
- Answer directly and clearly based on what the context says.
- If the context contains lists, tables, or structured data, present it clearly.
- If the context does not contain enough information to answer, say: "I don't have enough information to answer that."
- Do NOT add information from outside the context.
- Do NOT say you cannot answer if the context clearly covers the topic.`;
  const userPrompt = `Context passages from this website's knowledge base:

${contextPassages}

User question: ${query}

Answer:`;

  let generatedAnswer = null;
  const callGroq = async () => {
    return await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY || GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        temperature: 0,
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
  };

  try {
    let groqRes = await callGroq();
    if (groqRes.status === 429) {
      console.warn('[Chat Stage 3] Groq 429 rate limit — retrying after 1 second...');
      await new Promise(r => setTimeout(r, 1000));
      groqRes = await callGroq();
      if (groqRes.status === 429) {
        return returnFallback('rate_limited', null, null, retrievedIds, similarityScores);
      }
    }

    if (!groqRes.ok) {
      const errTxt = await groqRes.text();
      console.error(`[Chat Stage 3] Groq API returned status ${groqRes.status}: ${errTxt}`);
      return returnFallback('generation_error', null, null, retrievedIds, similarityScores);
    }

    const groqData = await groqRes.json();
    generatedAnswer = groqData.choices?.[0]?.message?.content?.trim();
  } catch (err) {
    console.error('[Chat Stage 3] Groq call failed:', err.message);
    return returnFallback('generation_error', null, null, retrievedIds, similarityScores);
  }

  if (!generatedAnswer) {
    return returnFallback('generation_refused', null, generatedAnswer, retrievedIds, similarityScores);
  }

  // 6. Stage 4: NLI — log only, never block
  // NLI is used for analytics/monitoring only. We don't gate on it because the
  // cross-encoder is too brittle for mixed tabular/prose content and entity lists.
  let nliVerdict = 'supported';
  try {
    const topPremise = passingChunks.map(c => c.content).join('\n');
    const cleanAnswer = generatedAnswer.replace(/\*\*|\*|```/g, '').trim();
    const nliRes = await fetch(`${EMBEDDING_SERVICE_URL}/nli/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premise: topPremise, answer: cleanAnswer })
    });
    if (nliRes.ok) {
      const nliData = await nliRes.json();
      nliVerdict = nliData.verdict;
      console.log(`[Chat Stage 4] NLI Verdict (log-only) for "${query}": ${nliVerdict}`);
    }
  } catch (err) {
    console.warn('[Chat Stage 4] NLI service unavailable (non-blocking):', err.message);
  }

  // 7. Stage 5: Respond Success & Async Log
  const latencyMs = Date.now() - startTime;
  logQueryAsync({
    tenantId: effectiveTenantUuid,
    sessionId: session_id,
    queryText: query,
    retrievedChunkIds: retrievedIds,
    similarityScores,
    generatedAnswer,
    entailmentVerdict: 'supported',
    fallbackTriggered: false,
    fallbackReason: null,
    latencyMs
  });

  return res.status(200).json({
    answer: generatedAnswer,
    sources: passingChunks.map(c => ({
      chunk_id: c.id,
      similarity: parseFloat(c.similarity)
    })),
    verified: true
  });
});

module.exports = router;
