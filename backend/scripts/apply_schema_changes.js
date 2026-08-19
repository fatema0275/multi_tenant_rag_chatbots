'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: console.log
});

async function main() {
  const stats = {
    tablesCleared: {},
    rlsPoliciesRemoved: [],
    tablesAltered: []
  };

  try {
    console.log('--- STEP 5: CLEAR CRAWL DATA (Order: document_chunks -> pages -> crawl_logs -> crawl_jobs -> sites) ---');
    
    // Check initial row counts before deletion
    const tablesToClear = ['document_chunks', 'pages', 'crawl_logs', 'crawl_jobs'];
    
    // Check if sites exists first
    const [sitesExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sites'
      );
    `);
    if (sitesExists[0].exists) {
      tablesToClear.push('sites');
    }

    for (const table of tablesToClear) {
      const [countRes] = await sequelize.query(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const rowCount = countRes[0].count;
      await sequelize.query(`DELETE FROM "${table}"`);
      stats.tablesCleared[table] = rowCount;
      console.log(`Cleared table ${table}: ${rowCount} rows deleted.`);
    }

    console.log('\n--- STEP 1: CREATE NEW TABLE: sites ---');
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain TEXT UNIQUE NOT NULL,
        crawl_status TEXT DEFAULT 'pending',
        last_crawled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    stats.tablesAltered.push({
      table: 'sites',
      changes: 'Created new table (id UUID PK gen_random_uuid(), domain TEXT UNIQUE NOT NULL, crawl_status TEXT DEFAULT pending, last_crawled_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)'
    });
    console.log('Created sites table successfully.');

    console.log('\n--- STEP 2: ALTER TABLE: websites ---');
    await sequelize.query(`
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
    `);
    stats.tablesAltered.push({
      table: 'websites',
      changes: 'Added column site_id (UUID, foreign key referencing sites(id) ON DELETE SET NULL)'
    });
    console.log('Altered websites table successfully.');

    console.log('\n--- STEP 3: ALTER TABLE: pages ---');
    await sequelize.query(`
      ALTER TABLE pages 
      ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE CASCADE;
    `);
    await sequelize.query(`
      ALTER TABLE pages 
      ALTER COLUMN website_id DROP NOT NULL;
    `);
    await sequelize.query(`
      DROP INDEX IF EXISTS pages_website_url_unique;
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS pages_site_url_unique ON pages (site_id, url) WHERE site_id IS NOT NULL;
    `);
    stats.tablesAltered.push({
      table: 'pages',
      changes: 'Added column site_id (UUID FK referencing sites(id)), made website_id nullable, replaced (website_id, url) unique constraint with (site_id, url) unique index'
    });
    console.log('Altered pages table successfully.');

    console.log('\n--- STEP 4: ALTER TABLE: document_chunks ---');
    await sequelize.query(`
      ALTER TABLE document_chunks 
      ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE CASCADE;
    `);
    await sequelize.query(`
      ALTER TABLE document_chunks 
      ALTER COLUMN website_id DROP NOT NULL;
    `);
    stats.tablesAltered.push({
      table: 'document_chunks',
      changes: 'Added column site_id (UUID FK referencing sites(id)), made website_id nullable'
    });
    console.log('Altered document_chunks table successfully.');

    console.log('\n--- STEP 7: RLS POLICY REVIEW & REMOVAL ---');
    // Check existing policies on document_chunks and pages
    const [dcPolicies] = await sequelize.query(`
      SELECT policyname FROM pg_policies WHERE tablename = 'document_chunks';
    `);
    for (const p of dcPolicies) {
      await sequelize.query(`DROP POLICY IF EXISTS "${p.policyname}" ON document_chunks;`);
      stats.rlsPoliciesRemoved.push({ table: 'document_chunks', policy: p.policyname });
      console.log(`Dropped RLS policy "${p.policyname}" on document_chunks`);
    }

    const [pagePolicies] = await sequelize.query(`
      SELECT policyname FROM pg_policies WHERE tablename = 'pages';
    `);
    for (const p of pagePolicies) {
      await sequelize.query(`DROP POLICY IF EXISTS "${p.policyname}" ON pages;`);
      stats.rlsPoliciesRemoved.push({ table: 'pages', policy: p.policyname });
      console.log(`Dropped RLS policy "${p.policyname}" on pages`);
    }

    await sequelize.query(`ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;`);
    await sequelize.query(`ALTER TABLE pages DISABLE ROW LEVEL SECURITY;`);
    console.log('Disabled RLS on shared tables document_chunks and pages.');

    console.log('\n=== MIGRATION & CLEANUP COMPLETED SUCCESSFULLY ===');
    console.log(JSON.stringify(stats, null, 2));

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
