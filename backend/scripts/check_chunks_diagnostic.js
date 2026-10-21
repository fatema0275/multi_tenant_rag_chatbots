const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function run() {
  const [chunks] = await s.query(`
    SELECT site_id, COUNT(*) as total_chunks,
           COUNT(CASE WHEN chunk_text ILIKE '%novatech%' THEN 1 END) as novatech_chunks,
           COUNT(CASE WHEN chunk_text ILIKE '%sign in to google%' OR chunk_text ILIKE '%you need permission%' OR chunk_text ILIKE '%google drive%' THEN 1 END) as bad_drive_chunks
    FROM document_chunks
    GROUP BY site_id;
  `);
  console.table(chunks);
  await s.close();
}

run().catch(console.error);
