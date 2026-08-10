'use strict';

const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

/**
 * chunkText — Splits page clean text into semantic chunks using LangChain's RecursiveCharacterTextSplitter.
 *
 * @param {string} pageText - Clean extracted text content of the page.
 * @param {object} metadata - Metadata object: { pageUrl, pageTitle, domSelector }.
 * @returns {Promise<Array<{ chunkText: string, metadata: object }>>} Array of chunk objects.
 */
async function chunkText(pageText, metadata = {}) {
  // Return empty array immediately if text is empty or whitespace
  if (!pageText || !pageText.trim()) {
    return [];
  }

  const { pageUrl, pageTitle, domSelector = null } = metadata;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const chunkStrings = await splitter.splitText(pageText);

  return chunkStrings.map((chunkString) => ({
    chunkText: chunkString,
    metadata: {
      pageUrl: pageUrl || '',
      pageTitle: pageTitle || null,
      domSelector: domSelector || null,
    },
  }));
}

module.exports = { chunkText };
