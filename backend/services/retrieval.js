'use strict';

const { sequelize } = require('../models');

// DEBUG_RETRIEVAL=true in .env enables verbose retrieval logging (never in production)
const DEBUG_RETRIEVAL = process.env.DEBUG_RETRIEVAL === 'true';


/**
 * retrieve_chunks — Module 5 & Module 9 Weighted Retrieval with pgvector Reinforcement & Hybrid Matching.
 * 
 * Orders chunks by a weighted score: (1 - cosine_distance) * feedback_weight + lexical/domain boosts.
 * A chunk with higher feedback_weight historically produced good answers and ranks higher.
 *
 * Per-site retrieval_threshold can be configured in chatbot_configs.retrieval_threshold.
 * If set, it overrides the threshold passed in from the caller.
 *
 * @param {object} params
 * @param {string} params.siteId - Tenant Site UUID
 * @param {Array<number>} params.queryEmbedding - query vector
 * @param {number} [params.threshold=0.30] - Minimum similarity threshold: (1 - distance) > threshold
 * @param {number} [params.topK=5] - Number of top chunks to return
 * @param {string|number} [params.websiteId] - Optional fallback website ID
 * @param {string} [params.queryText=''] - Raw query text for keyword & domain relevance boosting
 * @returns {Promise<Array<object>>} - List of retrieved document chunks ordered by weighted_score DESC
 */
async function retrieve_chunks({ siteId, queryEmbedding, threshold = 0.30, topK = 8, websiteId = null, queryText = '' }) {
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    throw new Error('retrieve_chunks: queryEmbedding array is required');
  }

  // Per-site retrieval_threshold override from chatbot_configs
  let effectiveThreshold = threshold;
  if (websiteId || siteId) {
    try {
      const [cfgRows] = await sequelize.query(
        `SELECT cc.retrieval_threshold
         FROM chatbot_configs cc
         LEFT JOIN websites w ON w.id = cc.website_id
         WHERE (cc.website_id = :websiteId OR w.site_id = :siteId)
           AND cc.retrieval_threshold IS NOT NULL
         LIMIT 1`,
        { replacements: { websiteId: websiteId || null, siteId: siteId || null } }
      );
      if (cfgRows.length > 0 && cfgRows[0].retrieval_threshold !== null) {
        effectiveThreshold = parseFloat(cfgRows[0].retrieval_threshold);
        if (DEBUG_RETRIEVAL) {
          console.log(`[Retrieval DEBUG] Per-site retrieval_threshold=${effectiveThreshold} from chatbot_configs for websiteId=${websiteId} siteId=${siteId}`);
        }
      }
    } catch (_) {
      // Column may not exist yet — non-blocking
    }
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Extract clean keywords (excluding strictly grammatical and conversational prompt words)
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'so', 'as',
    'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'how', 'this', 'that', 'these', 'those',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'should', 'could',
    'ought', 'their', 'theirs', 'there', 'above', 'after', 'again', 'against',
    'then', 'once', 'here', 'with', 'from', 'into', 'during', 'before', 'under',
    'further', 'find', 'look', 'tell', 'show', 'give', 'help',
    'list', 'down', 'please', 'explain', 'describe', 'about', 'details', 'some',
    'provide', 'can', 'you', 'your', 'our', 'all', 'any', 'many', 'much',
    'get', 'got', 'want', 'need', 'me', 'my', 'we', 'us', 'they', 'them',
    'page', 'pages', 'site', 'website', 'link', 'links', 'url', 'urls', 'section', 'area'
  ]);

  const rawTokens = String(queryText || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !stopWords.has(t));

  const stem = (w) => (w && w.length > 3 && w.endsWith('s')) ? w.slice(0, -1) : w;

  const primaryKeyword = rawTokens[0] || '';
  const secondaryKeyword = rawTokens[1] || '';
  const tertiaryKeyword = rawTokens[2] || '';

  let sql = '';
  let replacements = {
    siteId: siteId || null,
    websiteId: websiteId || null,
    vectorStr,
    threshold: effectiveThreshold,
    topK
  };

  if (primaryKeyword) {
    replacements.kw1 = `%${primaryKeyword}%`;
    replacements.kw1_stem = `%${stem(primaryKeyword)}%`;
    replacements.kw2 = secondaryKeyword ? `%${secondaryKeyword}%` : '';
    replacements.kw2_stem = secondaryKeyword ? `%${stem(secondaryKeyword)}%` : '';
    replacements.kw3 = tertiaryKeyword ? `%${tertiaryKeyword}%` : '';
    replacements.kw3_stem = tertiaryKeyword ? `%${stem(tertiaryKeyword)}%` : '';

    sql = `
      SELECT id, chunk_text, page_url, page_title, dom_selector, text_snippet, feedback_weight,
             (1 - (embedding <=> :vectorStr::vector)) AS similarity,
             (
               (1 - (embedding <=> :vectorStr::vector)) * COALESCE(feedback_weight, 1.0)
               + (CASE WHEN :kw1 <> '%' AND (page_url ILIKE :kw1 OR page_title ILIKE :kw1 OR page_url ILIKE :kw1_stem OR page_title ILIKE :kw1_stem) THEN 0.25 ELSE 0 END)
               + (CASE WHEN :kw1 <> '%' AND (chunk_text ILIKE :kw1 OR chunk_text ILIKE :kw1_stem) THEN 0.20 ELSE 0 END)
               + (CASE WHEN :kw2 <> '' AND (page_url ILIKE :kw2 OR page_title ILIKE :kw2 OR page_url ILIKE :kw2_stem OR page_title ILIKE :kw2_stem) THEN 0.15 ELSE 0 END)
               + (CASE WHEN :kw2 <> '' AND (chunk_text ILIKE :kw2 OR chunk_text ILIKE :kw2_stem) THEN 0.20 ELSE 0 END)
               + (CASE WHEN :kw3 <> '' AND (chunk_text ILIKE :kw3 OR chunk_text ILIKE :kw3_stem OR page_url ILIKE :kw3) THEN 0.15 ELSE 0 END)
               + (CASE WHEN page_url NOT ILIKE '%.pdf%' AND page_url NOT ILIKE '%drive.google.com%' THEN 0.20 ELSE 0 END)
             ) AS weighted_score
      FROM document_chunks
      WHERE (site_id = :siteId OR (site_id IS NULL AND website_id = :websiteId))
        AND (
          (1 - (embedding <=> :vectorStr::vector)) > :threshold
          OR (
            (:kw1 <> '%' AND (page_url ILIKE :kw1 OR page_title ILIKE :kw1 OR chunk_text ILIKE :kw1 OR chunk_text ILIKE :kw1_stem))
            AND (1 - (embedding <=> :vectorStr::vector)) > 0.10
          )
        )
      ORDER BY weighted_score DESC
      LIMIT :topK
    `;
  } else {
    sql = `
      SELECT id, chunk_text, page_url, page_title, dom_selector, text_snippet, feedback_weight,
             (1 - (embedding <=> :vectorStr::vector)) AS similarity,
             (
               (1 - (embedding <=> :vectorStr::vector)) * COALESCE(feedback_weight, 1.0)
               + (CASE WHEN page_url NOT ILIKE '%.pdf%' AND page_url NOT ILIKE '%drive.google.com%' THEN 0.15 ELSE 0 END)
             ) AS weighted_score
      FROM document_chunks
      WHERE (site_id = :siteId OR (site_id IS NULL AND website_id = :websiteId))
        AND (1 - (embedding <=> :vectorStr::vector)) > :threshold
      ORDER BY weighted_score DESC
      LIMIT :topK
    `;
  }

  const [rows] = await sequelize.query(sql, { replacements });

  // DEBUG_RETRIEVAL: verbose logging for local debugging only — never in production
  if (DEBUG_RETRIEVAL) {
    console.log('[Retrieval DEBUG] ────────────────────────────────────────');
    console.log(`[Retrieval DEBUG] Query text   : ${queryText}`);
    console.log(`[Retrieval DEBUG] Site ID      : ${siteId}`);
    console.log(`[Retrieval DEBUG] Website ID   : ${websiteId}`);
    console.log(`[Retrieval DEBUG] Threshold    : ${effectiveThreshold} (caller supplied: ${threshold})`);
    console.log(`[Retrieval DEBUG] topK         : ${topK}`);
    console.log(`[Retrieval DEBUG] Chunks found : ${rows.length}`);
    rows.slice(0, 3).forEach((r, i) => {
      const sim = r.similarity != null ? parseFloat(r.similarity).toFixed(4) : 'n/a';
      const preview = String(r.chunk_text || '').slice(0, 100).replace(/\s+/g, ' ');
      console.log(`[Retrieval DEBUG] Top-${i + 1}: similarity=${sim} | ${preview}`);
    });
    console.log('[Retrieval DEBUG] ────────────────────────────────────────');
  }

  return rows;
}

module.exports = {
  retrieve_chunks,
  retrieveChunks: retrieve_chunks
};
