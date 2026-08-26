const { sequelize } = require('../models');

async function fixQueryLogsType() {
  await sequelize.query(`
    ALTER TABLE query_logs 
    ALTER COLUMN retrieved_chunk_ids TYPE text[] USING retrieved_chunk_ids::text[];
  `);
  console.log('✅ Altered query_logs.retrieved_chunk_ids to text[] successfully!');
  process.exit(0);
}

fixQueryLogsType().catch(err => {
  console.error(err);
  process.exit(1);
});
