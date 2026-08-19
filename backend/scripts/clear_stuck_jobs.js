'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function main() {
  try {
    const [res] = await sequelize.query(`
      UPDATE crawl_jobs
      SET status = 'failed', error_message = 'Job timed out or reset during system startup', completed_at = NOW()
      WHERE status IN ('queued', 'running');
    `);
    console.log('Successfully cleared stuck jobs:', res);
  } catch (err) {
    console.error('Error clearing stuck jobs:', err);
  } finally {
    await sequelize.close();
  }
}

main();
