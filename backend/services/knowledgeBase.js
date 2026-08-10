'use strict';

const { sequelize } = require('../models');
const { chunkText } = require('./chunker');
const { embedTexts } = require('./embeddingClient');

/**
 * storePageChunks — Chunks text, generates embeddings, sets RLS context, and batch stores chunks in document_chunks.
 *
 * @param {object} params
 * @param {number} params.websiteId - Website ID (tenant).
 * @param {string} params.pageUrl - URL of the page.
 * @param {string} params.pageTitle - Title of the page.
 * @param {string} params.pageText - Clean page text to chunk and embed.
 * @param {string} [params.domSelector] - Optional DOM selector.
 * @returns {Promise<{ chunksStored: number }>}
 */
async function storePageChunks({ websiteId, pageUrl, pageTitle, pageText, domSelector }) {
  // a. Chunk the page text
  const chunks = await chunkText(pageText, { pageUrl, pageTitle, domSelector });

  // b. Return early if no chunks returned
  if (!chunks || chunks.length === 0) {
    console.warn(`[KnowledgeBase] Warning: No chunks generated for ${pageUrl} (empty content).`);
    return { chunksStored: 0 };
  }

  // c. Extract chunk text strings
  const chunkStrings = chunks.map((c) => c.chunkText);

  // d. Call embedTexts in a single batch
  const embeddings = await embedTexts(chunkStrings);

  if (!embeddings || embeddings.length !== chunks.length) {
    throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings?.length}`);
  }

  // e. Pair chunks with embeddings by index
  const items = chunks.map((chunk, index) => ({
    chunk,
    embedding: embeddings[index],
  }));

  // f. Open DB transaction
  const t = await sequelize.transaction();

  try {
    // g. Set RLS tenant context
    await sequelize.query(
      'SET LOCAL app.current_website_id = :websiteId;',
      { replacements: { websiteId: String(websiteId) }, transaction: t }
    );

    // h. Build single batched INSERT query
    const valuesClauses = [];
    const replacements = { websiteId };

    items.forEach((item, index) => {
      const pageUrlKey = `pageUrl_${index}`;
      const pageTitleKey = `pageTitle_${index}`;
      const chunkTextKey = `chunkText_${index}`;
      const domSelectorKey = `domSelector_${index}`;
      const embeddingKey = `embedding_${index}`;

      valuesClauses.push(
        `(:websiteId, :${pageUrlKey}, :${pageTitleKey}, :${chunkTextKey}, :${embeddingKey}::vector, :${domSelectorKey})`
      );

      replacements[pageUrlKey] = item.chunk.metadata.pageUrl || pageUrl;
      replacements[pageTitleKey] = item.chunk.metadata.pageTitle || pageTitle || null;
      replacements[chunkTextKey] = item.chunk.chunkText;
      replacements[embeddingKey] = `[${item.embedding.join(',')}]`;
      replacements[domSelectorKey] = item.chunk.metadata.domSelector || domSelector || null;
    });

    const insertSql = `
      INSERT INTO document_chunks (website_id, page_url, page_title, chunk_text, embedding, dom_selector)
      VALUES ${valuesClauses.join(', ')};
    `;

    await sequelize.query(insertSql, { replacements, transaction: t });

    // i. Commit transaction
    await t.commit();

    // j. Log success
    console.log(`[KnowledgeBase] Stored ${chunks.length} chunks for ${pageUrl}`);

    // k. Return count
    return { chunksStored: chunks.length };
  } catch (err) {
    // Rollback transaction on error
    try { await t.rollback(); } catch (_) {}
    console.error(`[KnowledgeBase] Error storing chunks for websiteId=${websiteId}, pageUrl=${pageUrl}:`, err);
    throw err;
  }
}

module.exports = { storePageChunks };
