const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { embedTexts } = require('../services/embeddingClient');

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const QUERY = 'list down the core service pillars';

async function run() {
  const [queryEmb] = await embedTexts([QUERY]);
  const vectorStr = `[${queryEmb.join(',')}]`;

  const [rows] = await s.query(`
    SELECT id, page_url, LEFT(chunk_text, 100) as preview,
           (1 - (embedding <=> :vectorStr::vector)) AS similarity
    FROM document_chunks
    WHERE site_id = '1ff03664-112f-4686-a40a-ce608fe9336b'
    ORDER BY similarity DESC
    LIMIT 10;
  `, { replacements: { vectorStr } });

  console.log(`Top 10 raw cosine similarity for: "${QUERY}"`);
  console.table(rows);
  await s.close();
}

run().catch(console.error);
