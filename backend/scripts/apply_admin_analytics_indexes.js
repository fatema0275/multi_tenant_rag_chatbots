'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: console.log
});

async function applyIndexes() {
  console.log('--- Applying Supabase Indexes for Admin Analytics Performance ---');
  
  const indexes = [
    // query_logs indexes for date range scans, fallback queries, verdict aggregation, and latency
    `CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs (created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_query_logs_fallback_created ON query_logs (fallback_triggered, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_query_logs_verdict_created ON query_logs (entailment_verdict, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_query_logs_reason ON query_logs (fallback_reason) WHERE fallback_reason IS NOT NULL;`,
    
    // crawl_jobs indexes for status and timeline
    `CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status_started ON crawl_jobs (status, started_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_crawl_jobs_website_id ON crawl_jobs (website_id);`,
    
    // document_chunks indexes
    `CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at ON document_chunks (created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_document_chunks_site_tenant ON document_chunks (site_id, tenant_id);`,

    // pages indexes for source_type breakdown and website count
    `CREATE INDEX IF NOT EXISTS idx_pages_website_source ON pages (website_id, source_type);`,
    `CREATE INDEX IF NOT EXISTS idx_pages_source_type ON pages (source_type);`,

    // users & websites indexes for admin metrics
    `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_websites_verification_created ON websites (verification_status, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_chatbot_configs_active_web ON chatbot_configs (is_active, website_id);`
  ];

  for (const sql of indexes) {
    try {
      await sequelize.query(sql);
      console.log('✅ Executed:', sql);
    } catch (err) {
      console.warn('⚠️ Warning on index:', sql, '->', err.message);
    }
  }

  console.log('--- All Admin Analytics Indexes Applied Successfully! ---');
  await sequelize.close();
}

applyIndexes().catch((err) => {
  console.error('Failed to apply indexes:', err);
  process.exit(1);
});
