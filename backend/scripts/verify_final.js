'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function main() {
  console.log('=====================================================');
  console.log('FINAL DATABASE VERIFICATION REPORT');
  console.log('=====================================================\n');

  // 1. Check tables & row counts
  const targetTables = ['users', 'websites', 'sites', 'pages', 'document_chunks', 'crawl_jobs', 'crawl_logs', 'chatbot_configs', 'manual_content'];
  console.log('--- TABLE ROW COUNTS ---');
  for (const table of targetTables) {
    try {
      const [res] = await sequelize.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      console.log(`Table '${table}': ${res[0].count} rows`);
    } catch (e) {
      console.log(`Table '${table}': ERROR (${e.message})`);
    }
  }

  // 2. Check sites columns
  console.log('\n--- SITES TABLE COLUMNS ---');
  const [siteCols] = await sequelize.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'sites'
    ORDER BY ordinal_position;
  `);
  console.table(siteCols);

  // 3. Check websites, pages, document_chunks columns for site_id FK
  console.log('\n--- SITE_ID COLUMN IN WEBSITES, PAGES, DOCUMENT_CHUNKS ---');
  const [siteIdCols] = await sequelize.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE column_name = 'site_id' AND table_name IN ('websites', 'pages', 'document_chunks');
  `);
  console.table(siteIdCols);

  // 4. Check RLS policies on document_chunks and pages
  console.log('\n--- RLS POLICIES ON PAGES & DOCUMENT_CHUNKS ---');
  const [policies] = await sequelize.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename IN ('document_chunks', 'pages');
  `);
  console.table(policies);

  await sequelize.close();
}

main();
