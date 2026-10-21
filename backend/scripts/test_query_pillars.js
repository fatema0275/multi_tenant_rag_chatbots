const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { retrieve_chunks } = require('../services/retrieval');
const { embedTexts } = require('../services/embeddingClient');

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';
const QUERY = 'list down the core service pillars';

async function run() {
  process.env.DEBUG_RETRIEVAL = 'true';
  const [queryEmbedding] = await embedTexts([QUERY]);

  console.log(`\nTesting with threshold = 0.30:`);
  const chunks = await retrieve_chunks({
    siteId: SITE_ID,
    queryEmbedding,
    threshold: 0.30,
    topK: 5,
    queryText: QUERY
  });

  console.log(`\nRetrieved ${chunks.length} chunks:`);
  chunks.forEach((c, i) => {
    console.log(`[Chunk ${i+1}] (id=${c.id}, similarity=${parseFloat(c.similarity).toFixed(4)}, weighted=${parseFloat(c.weighted_score).toFixed(4)})`);
    console.log(`  Url: ${c.page_url}`);
    console.log(`  Preview: ${String(c.chunk_text).slice(0, 150).replace(/\s+/g, ' ')}\n`);
  });
}

run().catch(console.error);
