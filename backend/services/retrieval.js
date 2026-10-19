'use strict';

const { sequelize } = require('../models');

/**
 * retrieve_chunks — Module 5 & Module 9 Weighted Retrieval with pgvector Reinforcement & Hybrid Matching.
 * 
 * Orders chunks by a weighted score: (1 - cosine_distance) * feedback_weight + lexical/domain boosts.
 * A chunk with higher feedback_weight historically produced good answers and ranks higher.
 *
 * @param {object} params
 * @param {string} params.siteId - Tenant Site UUID
 * @param {Array<number>} params.queryEmbedding - 384-dimensional query vector
 * @param {number} [params.threshold=0.30] - Minimum similarity threshold: (1 - distance) > threshold
 * @param {number} [params.topK=5] - Number of top chunks to return
 * @param {string|number} [params.websiteId] - Optional fallback website ID
 * @param {string} [params.queryText=''] - Raw query text for keyword & domain relevance boosting
 * @returns {Promise<Array<object>>} - List of retrieved document chunks ordered by weighted_score DESC
 */
async function retrieve_chunks({ siteId, queryEmbedding, threshold = 0.30, topK = 5, websiteId = null, queryText = '' }) {
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    throw new Error('retrieve_chunks: queryEmbedding array is required');
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Extract clean keywords (excluding strictly grammatical function words)
  const stopWords = new Set([
    'what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'have', 'has', 'had', 'having', 'does', 'did', 'doing', 'would', 'should', 'could',
    'ought', 'their', 'theirs', 'there', 'above', 'after', 'again', 'against',
    'then', 'once', 'here', 'with', 'from', 'into', 'during', 'before', 'under',
    'further', 'find', 'look', 'tell', 'show', 'give', 'help'
  ]);

  const rawTokens = String(queryText || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !stopWords.has(t));

  const primaryKeyword = rawTokens[0] || '';
  const secondaryKeyword = rawTokens[1] || '';

  let sql = '';
  let replacements = {
    siteId: siteId || null,
    websiteId: websiteId || null,
    vectorStr,
    threshold,
    topK
  };

  if (primaryKeyword) {
    replacements.kw1 = `%${primaryKeyword}%`;
    replacements.kw2 = secondaryKeyword ? `%${secondaryKeyword}%` : replacements.kw1;

    sql = `
      SELECT id, chunk_text, page_url, page_title, dom_selector, text_snippet, feedback_weight,
             (1 - (embedding <=> :vectorStr::vector)) AS similarity,
             (
               (1 - (embedding <=> :vectorStr::vector)) * COALESCE(feedback_weight, 1.0)
               + (CASE WHEN page_url ILIKE :kw1 THEN 0.25 ELSE 0 END)
               + (CASE WHEN page_title ILIKE :kw1 THEN 0.15 ELSE 0 END)
               + (CASE WHEN chunk_text ILIKE :kw1 THEN 0.10 ELSE 0 END)
               + (CASE WHEN :kw2 <> :kw1 AND (page_url ILIKE :kw2 OR page_title ILIKE :kw2) THEN 0.10 ELSE 0 END)
               + (CASE WHEN page_url NOT ILIKE '%drive.google.com%' THEN 0.08 ELSE 0 END)
             ) AS weighted_score
      FROM document_chunks
      WHERE (site_id = :siteId OR (site_id IS NULL AND website_id = :websiteId))
        AND (
          (1 - (embedding <=> :vectorStr::vector)) > :threshold
          OR (
            (page_url ILIKE :kw1 OR page_title ILIKE :kw1 OR chunk_text ILIKE :kw1)
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
               + (CASE WHEN page_url NOT ILIKE '%drive.google.com%' THEN 0.05 ELSE 0 END)
             ) AS weighted_score
      FROM document_chunks
      WHERE (site_id = :siteId OR (site_id IS NULL AND website_id = :websiteId))
        AND (1 - (embedding <=> :vectorStr::vector)) > :threshold
      ORDER BY weighted_score DESC
      LIMIT :topK
    `;
  }

  const [rows] = await sequelize.query(sql, { replacements });
  return rows;
}

module.exports = {
  retrieve_chunks,
  retrieveChunks: retrieve_chunks
};
