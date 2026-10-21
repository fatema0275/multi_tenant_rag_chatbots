const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';

async function run() {
  console.log(`Resetting retrieval_threshold to NULL (system default 0.30) for NovaTech site_id: ${SITE_ID}...`);

  const [res] = await s.query(`
    UPDATE chatbot_configs
    SET retrieval_threshold = NULL
    WHERE website_id IN (
      SELECT id FROM websites WHERE site_id = :siteId
    )
    RETURNING id, website_id, retrieval_threshold;
  `, { replacements: { siteId: SITE_ID } });

  console.log('Updated chatbot_configs rows (now NULL):', res);

  await s.close();
}

run().catch(console.error);
