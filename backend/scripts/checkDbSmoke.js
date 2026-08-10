'use strict';

const { sequelize } = require('../models');

async function runCheck() {
  try {
    await sequelize.query("SET LOCAL app.current_website_id = '2';");
    const [rows] = await sequelize.query(`
      SELECT 
        COUNT(*)::integer as total_chunks,
        COUNT(embedding)::integer as chunks_with_embeddings,
        MIN(LENGTH(chunk_text))::integer as min_chunk_len,
        MAX(LENGTH(chunk_text))::integer as max_chunk_len
      FROM document_chunks
      WHERE website_id = 2;
    `);

    console.log('--- Check 3 — DB Query Result ---');
    console.table(rows);
  } catch (err) {
    console.error('Error running DB query:', err);
  } finally {
    await sequelize.close();
  }
}

runCheck();
