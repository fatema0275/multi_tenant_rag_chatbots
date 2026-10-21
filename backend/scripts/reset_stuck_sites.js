const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function run() {
  const [res] = await s.query(`
    UPDATE sites
    SET crawl_status = 'cancelled'
    WHERE id = '3f6dd861-1f72-49e1-b3ba-3b81e8333c04' AND crawl_status = 'running';
  `);
  console.log('Reset crawler-test.com sites.crawl_status successfully.');
  await s.close();
}

run().catch(console.error);
