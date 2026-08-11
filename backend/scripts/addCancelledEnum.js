'use strict';

const { sequelize } = require('../models');

async function migrateEnum() {
  try {
    console.log('Adding "cancelled" to enum_crawl_jobs_status in Postgres...');
    await sequelize.query(`ALTER TYPE enum_crawl_jobs_status ADD VALUE IF NOT EXISTS 'cancelled';`);
    console.log('Enum migration successful!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrateEnum();
