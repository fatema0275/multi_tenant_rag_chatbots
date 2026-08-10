'use strict';

/**
 * Migration 17 — Enable pgvector and setup document_chunks table with RLS & HNSW index
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Enable pgvector extension
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    // 2. Re-create document_chunks table with exact specification
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS document_chunks CASCADE;

      CREATE TABLE document_chunks (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        page_url TEXT NOT NULL,
        page_title TEXT,
        chunk_text TEXT NOT NULL,
        embedding vector(384),
        dom_selector TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Enable Row-Level Security (RLS)
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
    `);

    // 4. Create RLS policy for tenant isolation
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'document_chunks' AND policyname = 'document_chunks_tenant_isolation'
        ) THEN
          CREATE POLICY document_chunks_tenant_isolation ON document_chunks
            FOR ALL
            USING (website_id = NULLIF(current_setting('app.current_website_id', true), '')::integer)
            WITH CHECK (website_id = NULLIF(current_setting('app.current_website_id', true), '')::integer);
        END IF;
      END $$;
    `);

    // 5. Create HNSW index for cosine similarity search
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
      ON document_chunks USING hnsw (embedding vector_cosine_ops);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS document_chunks CASCADE;
    `);
  }
};
