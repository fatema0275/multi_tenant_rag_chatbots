const { sequelize } = require('../models');

async function verifyPart1() {
  console.log('--- Verifying Part 1 Database Schema ---');

  // 1. Check tenants table columns
  const [tenantCols] = await sequelize.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tenants'"
  );
  console.log('tenants columns:', tenantCols.map(c => `${c.column_name} (${c.data_type})`));
  const hasSimilarityThreshold = tenantCols.some(c => c.column_name === 'similarity_threshold');
  if (!hasSimilarityThreshold) throw new Error('similarity_threshold missing from tenants table!');

  // 2. Check query_logs table columns
  const [queryLogCols] = await sequelize.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='query_logs'"
  );
  console.log('query_logs columns:', queryLogCols.map(c => `${c.column_name} (${c.data_type})`));
  const expectedCols = [
    'id', 'tenant_id', 'session_id', 'query_text', 'retrieved_chunk_ids',
    'similarity_scores', 'generated_answer', 'entailment_verdict',
    'fallback_triggered', 'fallback_reason', 'latency_ms', 'created_at'
  ];
  for (const col of expectedCols) {
    if (!queryLogCols.some(c => c.column_name === col)) {
      throw new Error(`query_logs missing column ${col}`);
    }
  }

  // 3. Check query_logs index
  const [indexes] = await sequelize.query(
    "SELECT indexname FROM pg_indexes WHERE tablename='query_logs'"
  );
  console.log('query_logs indexes:', indexes.map(i => i.indexname));

  // 4. Test chunks view
  const [chunksSample] = await sequelize.query('SELECT COUNT(*)::int AS count FROM chunks');
  console.log('chunks view working! Row count:', chunksSample[0].count);

  console.log('✅ PART 1 DATABASE SETUP CONFIRMED AND VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

verifyPart1().catch(err => {
  console.error('❌ Part 1 Verification Failed:', err);
  process.exit(1);
});
