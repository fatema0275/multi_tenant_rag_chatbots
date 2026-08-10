'use strict';

const path = require('path');
const { chunkText } = require('../backend/services/chunker');

const sampleText = `
SiteMind is an advanced multi-tenant Retrieval-Augmented Generation (RAG) platform designed to empower companies to build, customize, and deploy AI-powered chatbots trained on their own website content. By parsing domain data via automated web scraping, SiteMind extracts structured knowledge, cleans raw HTML, decomposes content into semantic chunks, and generates vector embeddings for real-time similarity search.

The architecture ensures strict multi-tenant data isolation using PostgreSQL Row-Level Security (RLS). Each tenant's website pages are processed independently, ensuring zero cross-tenant data bleed. The knowledge base pipeline split content into optimal token windows using LangChain's RecursiveCharacterTextSplitter, preserving semantic context across section boundaries while supporting overlap for edge-case query retrieval.

Once chunked, the text chunks are embedded using high-performance 384-dimensional SentenceTransformer models. These embeddings are stored in Supabase pgvector tables with Hierarchical Navigable Small World (HNSW) indexing to enable sub-millisecond nearest-neighbor search. The chatbot widget seamlessly renders on client websites, answering user questions with contextually verified grounding.
`.trim();

async function runTest() {
  console.log('--- Testing LangChain RecursiveCharacterTextSplitter Chunker ---');
  console.log('Sample text length:', sampleText.length, 'characters\n');

  try {
    const metadata = {
      pageUrl: 'https://example.com/test',
      pageTitle: 'Test Page',
      domSelector: null,
    };

    const chunks = await chunkText(sampleText, metadata);

    console.log('--- Results ---');
    console.log('Total number of chunks produced:', chunks.length);

    if (chunks.length > 0) {
      console.log('\n[First Chunk] (length:', chunks[0].chunkText.length, 'chars):');
      console.log('Text:', JSON.stringify(chunks[0].chunkText));
      console.log('Metadata:', chunks[0].metadata);

      console.log('\n[Last Chunk] (length:', chunks[chunks.length - 1].chunkText.length, 'chars):');
      console.log('Text:', JSON.stringify(chunks[chunks.length - 1].chunkText));
      console.log('Metadata:', chunks[chunks.length - 1].metadata);
    }

    // Verify all chunk lengths
    const oversizedChunks = chunks.filter((c) => c.chunkText.length > 600);
    if (oversizedChunks.length === 0) {
      console.log('\n✅ SUCCESS: All chunks are within ~500 character limit!');
    } else {
      console.error('\n❌ FAILED: Found oversized chunks:', oversizedChunks);
    }
  } catch (err) {
    console.error('\n❌ FAILED with error:', err);
  }
}

runTest();
