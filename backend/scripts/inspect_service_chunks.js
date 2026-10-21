const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';

async function run() {
  const [rows] = await s.query(`
    SELECT id, page_url, page_title, chunk_text
    FROM document_chunks
    WHERE site_id = :siteId
      AND (chunk_text ILIKE '%service%' OR chunk_text ILIKE '%Full-Stack%' OR chunk_text ILIKE '%Engineering%')
    LIMIT 10;
  `, { replacements: { siteId: SITE_ID } });

  console.log(`Found ${rows.length} chunks:`);
  rows.forEach((r, i) => {
    console.log(`\n--- Chunk ${i + 1} (id=${r.id}, url=${r.page_url}) ---`);
    console.log(r.chunk_text);
  });

  await s.close();
}

run().catch(console.error);
