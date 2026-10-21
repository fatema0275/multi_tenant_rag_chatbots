const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';

async function run() {
  console.log(`Starting cleanup for site_id: ${SITE_ID}...`);

  // Delete all bad chunks matching drive texts, drive URLs, or too short
  const [delChunksResult] = await s.query(`
    DELETE FROM document_chunks 
    WHERE site_id = :siteId
    AND (
      chunk_text ILIKE '%sign in to google%'
      OR chunk_text ILIKE '%you need permission%'
      OR chunk_text ILIKE '%google drive%'
      OR chunk_text ILIKE '%accounts.google.com%'
      OR chunk_text ILIKE '%open with google%'
      OR page_url ILIKE '%drive.google.com%'
      OR page_url ILIKE '%docs.google.com%'
      OR page_url ILIKE '%accounts.google.com%'
      OR LENGTH(TRIM(chunk_text)) < 50
    );
  `, { replacements: { siteId: SITE_ID } });

  console.log('document_chunks deleted count:', delChunksResult.rowCount || delChunksResult);

  // Delete corresponding pages rows
  const [delPagesResult] = await s.query(`
    DELETE FROM pages
    WHERE site_id = :siteId
    AND (
      url ILIKE '%drive.google.com%'
      OR url ILIKE '%docs.google.com%'
      OR url ILIKE '%accounts.google.com%'
    );
  `, { replacements: { siteId: SITE_ID } });

  console.log('pages deleted count:', delPagesResult.rowCount || delPagesResult);

  // Verify remaining chunks count
  const [remaining] = await s.query(`
    SELECT COUNT(*) as clean_chunks_count
    FROM document_chunks
    WHERE site_id = :siteId;
  `, { replacements: { siteId: SITE_ID } });

  console.log('Remaining clean chunks:', remaining[0]);

  const [samples] = await s.query(`
    SELECT page_url, page_title, LEFT(chunk_text, 150) as preview
    FROM document_chunks
    WHERE site_id = :siteId
    LIMIT 5;
  `, { replacements: { siteId: SITE_ID } });

  console.log('Sample clean chunks:');
  samples.forEach((sample, i) => {
    console.log(`[Chunk ${i+1}] ${sample.page_url} | ${sample.page_title} -> ${sample.preview}`);
  });

  await s.close();
}

run().catch(console.error);
