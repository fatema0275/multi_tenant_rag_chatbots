'use strict';

const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
} catch (e) {
  try {
    require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../backend/.env') });
  } catch (_) {}
}

const { sequelize, Website } = require('../backend/models');
const { storePageChunks } = require('../backend/services/knowledgeBase');

const dummyPageText = `
SiteMind Knowledge Base Pipeline is designed for enterprise RAG workloads with strict multi-tenant isolation.
The architecture combines asynchronous web crawling, clean DOM text extraction, LangChain semantic chunking, and SentenceTransformer embedding generation.

Each document chunk produced by the chunker contains 500 characters with 50-character overlap to ensure contextual continuity across boundaries.
When chunks are submitted to the knowledge base, they are embedded into 384-dimensional vector spaces using the all-MiniLM-L6-v2 model.

The resulting vector embeddings are stored in Supabase PostgreSQL database tables with Row-Level Security (RLS) policies enforced.
Tenant context is set per transaction via PostgreSQL session variables.
With HNSW cosine similarity indexing enabled, semantic vector searches execute with sub-millisecond latency.
This enables the embeddable chatbot widget to respond to user questions accurately and without hallucinations.
`.trim();

async function runTest() {
  console.log('--- Testing KnowledgeBase chunk storage function ---');
  try {
    let site = await Website.findOne();
    if (!site) {
      site = await Website.create({ user_id: 1, domain: 'test-kb-demo.com', verification_status: 'verified' });
    }
    const testWebsiteId = site.id;
    console.log(`Using test website_id: ${testWebsiteId} (${site.domain})`);

    const pageUrl = 'https://example.com/docs/rag-architecture';
    const pageTitle = 'RAG Architecture Overview';

    console.log(`\nCalling storePageChunks for ${pageUrl}...`);
    const result = await storePageChunks({
      websiteId: testWebsiteId,
      pageUrl,
      pageTitle,
      pageText: dummyPageText,
      domSelector: 'article.main-content'
    });

    console.log('\n--- Result ---');
    console.log('Returned result:', result);

    await sequelize.query('SET LOCAL app.current_website_id = :testWebsiteId;', {
      replacements: { testWebsiteId: String(testWebsiteId) }
    });

    const [rows] = await sequelize.query(
      `SELECT COUNT(*)::integer AS count FROM document_chunks WHERE website_id = :testWebsiteId`,
      { replacements: { testWebsiteId } }
    );
    const dbCount = rows[0].count;
    console.log(`\nSQL count for website_id=${testWebsiteId}:`, dbCount);

    const [sampleRows] = await sequelize.query(
      `SELECT id, page_url, chunk_text, (embedding IS NOT NULL) AS has_embedding
       FROM document_chunks
       WHERE website_id = :testWebsiteId
       LIMIT 5`,
      { replacements: { testWebsiteId } }
    );
    console.log('\n--- Sample Rows in document_chunks ---');
    console.table(sampleRows);

    if (result.chunksStored > 0 && dbCount >= result.chunksStored) {
      console.log('\n✅ SUCCESS: Chunks successfully embedded and stored in DB with pgvector embeddings!');
    } else {
      console.error('\n❌ FAILED: Count mismatch or 0 chunks stored');
    }
  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
  } finally {
    await sequelize.close();
  }
}

runTest();
