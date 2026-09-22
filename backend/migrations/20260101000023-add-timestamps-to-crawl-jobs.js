'use strict';

/**
 * Migration 23 — Add created_at and updated_at timestamps to crawl_jobs
 * for stale job timeout and heartbeat tracking.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE crawl_jobs
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE crawl_jobs
      DROP COLUMN IF EXISTS created_at,
      DROP COLUMN IF EXISTS updated_at;
    `);
  }
};
