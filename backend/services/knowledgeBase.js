'use strict';

const { sequelize, Website } = require('../models');
const { chunkText } = require('./chunker');
const { embedTexts } = require('./embeddingClient');

/**
 * storePageChunks — Chunks text, generates embeddings, and batch stores chunks in document_chunks linked to site_id.
 *
 * @param {object} params
 * @param {string} [params.siteId] - Site UUID.
 * @param {number} [params.websiteId] - Optional Website ID fallback to find site_id.
 * @param {string} params.pageUrl - URL of the page.
 * @param {string} params.pageTitle - Title of the page.
 * @param {string} params.pageText - Clean page text to chunk and embed.
 * @param {string} [params.domSelector] - Optional DOM selector.
 * @returns {Promise<{ chunksStored: number }>}
 */
async function storePageChunks({ siteId, websiteId, pageUrl, pageTitle, pageText, domSelector }) {
  // Resolve siteId if websiteId was passed instead
  let resolvedSiteId = siteId;
  if (!resolvedSiteId && websiteId) {
    const website = await Website.findByPk(websiteId);
    if (website && website.site_id) {
      resolvedSiteId = website.site_id;
    }
  }

  // a. Chunk the page text (256 tokens / 32 overlap)
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
    // h. Build single batched INSERT query using site_id and website_id
    const valuesClauses = [];
    const replacements = { siteId: resolvedSiteId || null, websiteId: websiteId || null };

    items.forEach((item, index) => {
      const pageUrlKey = `pageUrl_${index}`;
      const pageTitleKey = `pageTitle_${index}`;
      const chunkTextKey = `chunkText_${index}`;
      const domSelectorKey = `domSelector_${index}`;
      const embeddingKey = `embedding_${index}`;

      valuesClauses.push(
        `(:siteId, :websiteId, :${pageUrlKey}, :${pageTitleKey}, :${chunkTextKey}, :${embeddingKey}::vector, :${domSelectorKey})`
      );

      replacements[pageUrlKey] = item.chunk.metadata.pageUrl || pageUrl;
      replacements[pageTitleKey] = item.chunk.metadata.pageTitle || pageTitle || null;
      replacements[chunkTextKey] = item.chunk.chunkText;
      replacements[embeddingKey] = `[${item.embedding.join(',')}]`;
      replacements[domSelectorKey] = item.chunk.metadata.domSelector || domSelector || null;
    });

    const insertSql = `
      INSERT INTO document_chunks (site_id, website_id, page_url, page_title, chunk_text, embedding, dom_selector)
      VALUES ${valuesClauses.join(', ')};
    `;

    await sequelize.query(insertSql, { replacements, transaction: t });

    // i. Commit transaction
    await t.commit();

    // j. Log success
    console.log(`[KnowledgeBase] Stored ${chunks.length} chunks for ${pageUrl} (site_id=${resolvedSiteId})`);

    // k. Return count
    return { chunksStored: chunks.length };
  } catch (err) {
    // Rollback transaction on error
    try { await t.rollback(); } catch (_) {}
    console.error(`[KnowledgeBase] Error storing chunks for siteId=${resolvedSiteId}, pageUrl=${pageUrl}:`, err);
    throw err;
  }
}

module.exports = { storePageChunks };
