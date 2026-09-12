'use strict';

const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

/**
 * chunkText — Splits page clean text into semantic chunks using LangChain's RecursiveCharacterTextSplitter.
 * Generates an xpath-style positional dom_selector JSON object and 120-character text_snippet.
 *
 * @param {string} pageText - Clean extracted text content of the page.
 * @param {object} metadata - Metadata object: { pageUrl, pageTitle, domSelector }.
 * @returns {Promise<Array<{ chunkText: string, metadata: object, textSnippet: string }>>} Array of chunk objects.
 */
async function chunkText(pageText, metadata = {}) {
  // Return empty array immediately if text is empty or whitespace
  if (!pageText || !pageText.trim()) {
    return [];
  }

  const { pageUrl, pageTitle, domSelector = null } = metadata;

  // Split the full page clean text into natural paragraphs
  const paragraphs = pageText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 256,
    chunkOverlap: 32,
  });

  const chunkStrings = await splitter.splitText(pageText);

  return chunkStrings.map((chunkString) => {
    // Determine chunk's starting text (~40 characters) to find which paragraph index it falls in
    const chunkStart = chunkString.trim().slice(0, 40).toLowerCase();
    let paragraphIndex = -1;
    if (chunkStart) {
      paragraphIndex = paragraphs.findIndex((p) => p.toLowerCase().includes(chunkStart));
    }
    if (paragraphIndex === -1 && paragraphs.length > 0) {
      paragraphIndex = 0;
    }

    // Extract first sentence of the chunk (up to sentence boundary or newline)
    const sentenceMatch = chunkString.trim().match(/^[^.!?\n]+[.!?]?/);
    const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : chunkString.trim();

    // Take the first 80 characters of the chunk's first sentence
    const snippet = firstSentence.slice(0, 80).trim();

    // dom_selector as JSON string with type ('text-match') and snippet (first 80 chars)
    const generatedDomSelector = domSelector || JSON.stringify({
      type: 'text-match',
      snippet: snippet,
    });

    // text_snippet: first 120 characters of chunk_text
    const textSnippet = chunkString.slice(0, 120);

    return {
      chunkText: chunkString,
      textSnippet,
      metadata: {
        pageUrl: pageUrl || '',
        pageTitle: pageTitle || null,
        domSelector: generatedDomSelector,
        paragraphIndex,
      },
    };
  });
}

module.exports = { chunkText };
