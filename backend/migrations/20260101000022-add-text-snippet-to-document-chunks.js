'use strict';

/**
 * Migration 22 — Module 7 Visual Pointing:
 * 1. Add text_snippet column (TEXT, nullable) to document_chunks
 * 2. Update chunks view to expose dom_selector and text_snippet
 * 3. Run one-time backfill: UPDATE document_chunks SET text_snippet = LEFT(chunk_text, 120) WHERE text_snippet IS NULL
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add text_snippet column to document_chunks
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks
      ADD COLUMN IF NOT EXISTS text_snippet TEXT;
    `);

    // 2. Update chunks view to expose dom_selector and text_snippet
    await queryInterface.sequelize.query(`
      DROP VIEW IF EXISTS chunks CASCADE;
      CREATE VIEW chunks AS
      SELECT 
        id, 
        chunk_text AS content, 
        embedding, 
        COALESCE(tenant_id, site_id) AS tenant_id, 
        website_id, 
        site_id, 
        page_url, 
        page_title, 
        created_at,
        dom_selector,
        text_snippet
      FROM document_chunks;
    `);

    // 3. One-time backfill for existing chunks
    await queryInterface.sequelize.query(`
      UPDATE document_chunks
      SET text_snippet = LEFT(chunk_text, 120)
      WHERE text_snippet IS NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert chunks view to previous definition
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW chunks AS
      SELECT 
        id, 
        chunk_text AS content, 
        embedding, 
        COALESCE(tenant_id, site_id) AS tenant_id, 
        website_id, 
        site_id, 
        page_url, 
        page_title, 
        created_at
      FROM document_chunks;
    `);

    // Drop text_snippet column
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks
      DROP COLUMN IF EXISTS text_snippet;
    `);
  }
};
