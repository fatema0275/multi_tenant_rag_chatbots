'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: console.log
});

async function applyModule9Schema() {
  console.log('--- APPLYING MODULE 9 SCHEMA CHANGES ---');

  // 1. document_chunks: feedback_weight column & check constraint
  console.log('\n1. Altering document_chunks: adding feedback_weight...');
  await sequelize.query(`
    ALTER TABLE document_chunks 
    ADD COLUMN IF NOT EXISTS feedback_weight FLOAT NOT NULL DEFAULT 1.0;
  `);

  // Ensure check constraint exists
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_chunks_feedback_weight'
      ) THEN
        ALTER TABLE document_chunks
        ADD CONSTRAINT chk_document_chunks_feedback_weight
        CHECK (feedback_weight >= 0.1 AND feedback_weight <= 3.0);
      END IF;
    END $$;
  `);

  // Update chunks view to include feedback_weight
  console.log('Updating chunks view...');
  await sequelize.query(`DROP VIEW IF EXISTS chunks CASCADE;`);
  await sequelize.query(`
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
      feedback_weight
    FROM document_chunks;
  `);

  // 2. chat_sessions table
  console.log('\n2. Creating chat_sessions table if not exists...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_token TEXT,
      website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Recreate messages table with UUID primary key to support feedback FK
  console.log('\n3. Ensuring messages table has UUID primary key...');
  // Drop feedback first since it may reference messages
  await sequelize.query(`DROP TABLE IF EXISTS feedback CASCADE;`);

  // Check if messages exists and has int id
  const [messagesCols] = await sequelize.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'id';
  `);
  if (messagesCols.length > 0 && messagesCols[0].data_type !== 'uuid') {
    await sequelize.query(`DROP TABLE IF EXISTS messages CASCADE;`);
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT,
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 4. Create feedback table
  console.log('\n4. Creating feedback table...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID REFERENCES messages(id) UNIQUE,
      session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
      website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
      rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
      retrieved_chunk_ids UUID[] NOT NULL,
      top_chunk_ids UUID[] NOT NULL,
      query_embedding vector(384),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Create feedback_examples table
  console.log('\n5. Creating feedback_examples table...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS feedback_examples (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
      query_embedding vector(384) NOT NULL,
      rating TEXT CHECK (rating IN ('up', 'down')),
      representative_query TEXT,
      example_count INTEGER DEFAULT 1,
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Add pgvector index on query_embedding for fast cosine distance matching
  console.log('Adding pgvector index on feedback_examples(query_embedding)...');
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_feedback_examples_embedding
    ON feedback_examples USING hnsw (query_embedding vector_cosine_ops);
  `);

  // 6. Create weight_decay_log table
  console.log('\n6. Creating weight_decay_log table...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS weight_decay_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_at TIMESTAMPTZ DEFAULT NOW(),
      chunks_updated INTEGER,
      sites_affected INTEGER
    );
  `);

  // 7. query_logs additions: retrieval_adaptation and query_embedding
  console.log('\n7. Adding columns to query_logs...');
  await sequelize.query(`
    ALTER TABLE query_logs
    ADD COLUMN IF NOT EXISTS retrieval_adaptation TEXT,
    ADD COLUMN IF NOT EXISTS query_embedding vector(384);
  `);

  console.log('\n✅ All Module 9 schema changes successfully applied!');
  process.exit(0);
}

applyModule9Schema().catch(err => {
  console.error('❌ Failed to apply Module 9 schema:', err);
  process.exit(1);
});
