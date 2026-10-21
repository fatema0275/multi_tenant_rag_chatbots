const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';

async function run() {
  console.log(`Running diagnostic for NovaTech site_id: ${SITE_ID}...`);

  const [countStats] = await s.query(`
    SELECT
      COUNT(*) FILTER (WHERE chunk_text ILIKE '%sign in to google%')    AS google_signin,
      COUNT(*) FILTER (WHERE chunk_text ILIKE '%you need permission%')   AS need_permission,
      COUNT(*) FILTER (WHERE chunk_text ILIKE '%google drive%')          AS google_drive_text,
      COUNT(*) FILTER (WHERE chunk_text ILIKE '%accounts.google.com%')   AS google_accounts,
      COUNT(*) FILTER (WHERE chunk_text ILIKE '%open with google%')      AS open_with_google,
      COUNT(*) FILTER (WHERE LENGTH(TRIM(chunk_text)) < 50)              AS too_short,
      COUNT(*)                                                            AS total_chunks
    FROM document_chunks 
    WHERE site_id = :siteId;
  `, { replacements: { siteId: SITE_ID } });

  console.log('Category Counts:', countStats[0]);

  const [enums] = await s.query(`SELECT enum_range(NULL::page_crawl_status);`);
  console.log('page_crawl_status enum values:', enums[0]);

  const [badPages] = await s.query(`
    SELECT COUNT(*) as bad_pages_count
    FROM pages
    WHERE site_id = :siteId
    AND (
      url ILIKE '%drive.google.com%'
      OR url ILIKE '%docs.google.com%'
      OR url ILIKE '%accounts.google.com%'
    );
  `, { replacements: { siteId: SITE_ID } });
  const [urlStats] = await s.query(`
    SELECT
      COUNT(CASE WHEN page_url ILIKE '%drive.google.com%' THEN 1 END) as drive_url_chunks,
      COUNT(CASE WHEN page_url ILIKE '%demo-project-theta-brown%' THEN 1 END) as site_url_chunks,
      COUNT(*) as total_chunks
    FROM document_chunks
    WHERE site_id = :siteId;
  `, { replacements: { siteId: SITE_ID } });
  console.log('URL breakdown:', urlStats[0]);

  await s.close();
}

run().catch(console.error);
