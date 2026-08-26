'use strict';

/**
 * Migration 20 — Module 5 Database Setup:
 * 1. Create tenants table if not existing and add similarity_threshold column
 * 2. Create query_logs table with exact specification & index
 * 3. Add tenant_id to document_chunks and create chunks view for RAG vector queries
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Ensure pgcrypto for gen_random_uuid()
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Create/Alter tenants table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        similarity_threshold FLOAT DEFAULT 0.72,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS similarity_threshold FLOAT DEFAULT 0.72;
    `);

    // 3. Drop existing query_logs if it had incompatible structure from early draft
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS query_logs CASCADE;`);

    // 4. Create query_logs table with exact Module 5 spec
    await queryInterface.sequelize.query(`
      CREATE TABLE query_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        session_id TEXT,
        query_text TEXT NOT NULL,
        retrieved_chunk_ids TEXT[],
        similarity_scores FLOAT[],
        generated_answer TEXT,
        entailment_verdict TEXT CHECK (entailment_verdict IN ('supported', 'partial', 'unsupported')),
        fallback_triggered BOOLEAN DEFAULT FALSE,
        fallback_reason TEXT CHECK (fallback_reason IN (
          'insufficient_retrieval',
          'generation_refused',
          'generation_error',
          'verification_unavailable',
          'unsupported',
          'partial',
          'rate_limited'
        )),
        latency_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Add index on query_logs (tenant_id, created_at DESC)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_query_logs_tenant_created 
      ON query_logs (tenant_id, created_at DESC);
    `);

    // 6. Ensure document_chunks has tenant_id column and chunks view
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    `);

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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS chunks CASCADE;`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS query_logs CASCADE;`);
    await queryInterface.sequelize.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS similarity_threshold;`);
  }
};
