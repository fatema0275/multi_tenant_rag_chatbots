const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';

async function run() {
  console.log(`Setting retrieval_threshold to 0.55 for NovaTech site_id: ${SITE_ID}...`);

  await s.query('ALTER TABLE chatbot_configs ADD COLUMN IF NOT EXISTS retrieval_threshold FLOAT DEFAULT NULL;');

  const [res] = await s.query(`
    UPDATE chatbot_configs
    SET retrieval_threshold = 0.55
    WHERE website_id IN (
      SELECT id FROM websites WHERE site_id = :siteId
    )
    RETURNING id, website_id, retrieval_threshold;
  `, { replacements: { siteId: SITE_ID } });

  console.log('Updated chatbot_configs rows:', res);

  const [check] = await s.query(`
    SELECT cc.id, cc.website_id, cc.retrieval_threshold, w.domain, w.site_id
    FROM chatbot_configs cc
    JOIN websites w ON w.id = cc.website_id
    WHERE w.site_id = :siteId;
  `, { replacements: { siteId: SITE_ID } });
  console.table(check);

  await s.close();
}

run().catch(console.error);
