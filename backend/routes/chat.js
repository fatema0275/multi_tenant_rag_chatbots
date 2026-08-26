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
            tenantId,
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

// Optional auth middleware — parses JWT if present, but allows public widget queries
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
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
  const greetings = ['hi', 'hello', 'hey', 'heya', 'greetings', 'good morning', 'good afternoon', 'good evening', 'help'];
  const clarifications = ['what', 'pardon', 'tell me more', 'more info', 'can you explain', 'explain', 'how'];

  if (greetings.includes(cleanQuery)) {
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
      answer: `Hello! Welcome to ${siteName}. How can I assist you with information from our site today?`,
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

  // Ensure tenant row exists in tenants table for foreign key integrity
  try {
    await sequelize.query(
      `INSERT INTO tenants (id, name, similarity_threshold)
       VALUES (:tenantId, 'Tenant ' || :tenantId, 0.72)
       ON CONFLICT (id) DO NOTHING;`,
      { replacements: { tenantId } }
    );
  } catch (_) {}

  // 2. Fetch tenant similarity_threshold
  let similarityThreshold = 0.30;
  try {
    const [tenantRows] = await sequelize.query(
      'SELECT similarity_threshold FROM tenants WHERE id = :tenantId',
      { replacements: { tenantId } }
    );
    if (tenantRows.length > 0 && tenantRows[0].similarity_threshold !== null) {
      similarityThreshold = parseFloat(tenantRows[0].similarity_threshold);
    }
  } catch (err) {
    console.warn(`[Chat] Could not query similarity_threshold for tenant ${tenantId}, using default 0.30: ${err.message}`);
  }

  // Helper to construct fallback response & log asynchronously
  const returnFallback = (reason, verdict = null, genAnswer = null, chunkIds = [], scores = []) => {
    const latencyMs = Date.now() - startTime;
    logQueryAsync({
      tenantId,
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

  // 4. Stage 2: Retrieve Chunks using pgvector Cosine Similarity
  let retrievedChunks = [];
  try {
    const vectorString = `[${queryEmbedding.join(',')}]`;
    const [rows] = await sequelize.query(
      `SELECT id, content, 1 - (embedding <=> :vectorStr::vector) AS similarity
       FROM chunks
       WHERE tenant_id::text = :tenantId OR site_id::text = :tenantId OR website_id::text = :tenantId
       ORDER BY embedding <=> :vectorStr::vector
       LIMIT 5;`,
      { replacements: { vectorStr: vectorString, tenantId } }
    );
    retrievedChunks = rows;
  } catch (err) {
    console.error('[Chat Stage 2] Vector retrieval error:', err.message);
    return returnFallback('generation_error');
  }

  // Filter chunks using tenant threshold (or fallback 0.05 for crawled site content)
  const effectiveThreshold = Math.min(similarityThreshold, 0.05);
  const passingChunks = retrievedChunks.filter(c => parseFloat(c.similarity) >= effectiveThreshold);
  const retrievedIds = retrievedChunks.map(c => c.id);
  const similarityScores = retrievedChunks.map(c => parseFloat(c.similarity));

  if (passingChunks.length < 1) {
    return returnFallback('insufficient_retrieval', null, null, retrievedIds, similarityScores);
  }

  // 5. Stage 3: Generate Answer with Groq LLM
  const contextPassages = passingChunks.map((c, i) => `Passage [${i + 1}]: ${c.content}`).join('\n\n');
  const systemPrompt = `You are an assistant for SiteMind. Use ONLY the provided context passages to answer the user's question. If the context does not contain enough information to answer the question, respond with exactly "I don't have enough information to answer that.".`;
  const userPrompt = `Context:\n${contextPassages}\n\nQuestion: ${query}`;

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

  if (!generatedAnswer || generatedAnswer === "I don't have enough information to answer that.") {
    return returnFallback('generation_refused', null, generatedAnswer, retrievedIds, similarityScores);
  }

  // 6. Stage 4: Verify NLI Entailment
  const topPremise = passingChunks.map(c => c.content).join('\n');
  let nliVerdict = 'unsupported';
  const cleanAnswer = generatedAnswer.replace(/\*\*|\*|```/g, '').trim();
  try {
    const nliRes = await fetch(`${EMBEDDING_SERVICE_URL}/nli/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        premise: topPremise,
        answer: cleanAnswer
      })
    });

    if (!nliRes.ok) throw new Error(`NLI status ${nliRes.status}`);
    const nliData = await nliRes.json();
    nliVerdict = nliData.verdict;
  } catch (err) {
    console.error('[Chat Stage 4] NLI service unreachable/error:', err.message);
    return returnFallback('verification_unavailable', null, generatedAnswer, retrievedIds, similarityScores);
  }

  if (nliVerdict === 'unsupported') {
    return returnFallback(nliVerdict, nliVerdict, generatedAnswer, retrievedIds, similarityScores);
  }

  // 7. Stage 5: Respond Success & Async Log
  const latencyMs = Date.now() - startTime;
  logQueryAsync({
    tenantId,
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
