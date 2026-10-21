const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { retrieve_chunks } = require('../services/retrieval');

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';

async function run() {
  process.env.DEBUG_RETRIEVAL = 'true';

  // 1. Fetch an embedding from an existing chunk to simulate vector search
  const [sampleRows] = await s.query(`
    SELECT id, page_title, page_url, embedding::text as emb_str
    FROM document_chunks
    WHERE site_id = :siteId
    AND chunk_text ILIKE '%Platform%'
    LIMIT 1;
  `, { replacements: { siteId: SITE_ID } });

  if (!sampleRows.length) {
    console.error('No sample chunk found');
    await s.close();
    return;
  }

  const sample = sampleRows[0];
  const vector = sample.emb_str
    .replace(/[\[\]]/g, '')
    .split(',')
    .map(Number);

  console.log(`Testing retrieve_chunks for query: "what services does NovaTech provide"...`);
  const chunks = await retrieve_chunks({
    siteId: SITE_ID,
    queryEmbedding: vector,
    websiteId: 38,
    queryText: 'what services does NovaTech provide',
    topK: 5
  });

  console.log(`\nRetrieved ${chunks.length} chunks:`);
  chunks.forEach((c, i) => {
    console.log(`[Result ${i+1}] ${c.page_title} (${c.page_url})`);
    console.log(`  Similarity: ${c.similarity} | Weighted score: ${c.weighted_score}`);
    console.log(`  Snippet: ${String(c.chunk_text).slice(0, 120).replace(/\s+/g, ' ')}\n`);
  });

  await s.close();
}

run().catch(console.error);
