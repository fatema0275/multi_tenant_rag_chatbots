'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    
    // 1. Create sites table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain TEXT UNIQUE NOT NULL,
        crawl_status TEXT DEFAULT 'pending',
        last_crawled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Alter websites
    await queryInterface.sequelize.query(`
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
    `);

    // 3. Alter pages
    await queryInterface.sequelize.query(`
      ALTER TABLE pages 
      ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE pages ALTER COLUMN website_id DROP NOT NULL;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS pages_website_url_unique;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS pages_site_url_unique ON pages (site_id, url) WHERE site_id IS NOT NULL;
    `);

    // 4. Alter document_chunks
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks 
      ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks ALTER COLUMN website_id DROP NOT NULL;
    `);

    // 5. Remove tenant policy
    await queryInterface.sequelize.query(`
      DROP POLICY IF EXISTS document_chunks_tenant_isolation ON document_chunks;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE pages DISABLE ROW LEVEL SECURITY;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`ALTER TABLE document_chunks DROP COLUMN IF EXISTS site_id;`);
    await queryInterface.sequelize.query(`ALTER TABLE pages DROP COLUMN IF EXISTS site_id;`);
    await queryInterface.sequelize.query(`ALTER TABLE websites DROP COLUMN IF EXISTS site_id;`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS sites;`);
  }
};
