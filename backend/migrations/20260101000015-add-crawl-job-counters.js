'use strict';

/**
 * Migration 15 — Add running-count columns and crawl_type to `crawl_jobs`
 *
 * The existing `crawl_jobs` table (migration 003) only has:
 *   id, website_id, status, started_at, completed_at
 *
 * 🚩 ALL columns added here are NEW (not in the original migration):
 *   pages_found     — total URLs discovered in this crawl run
 *   pages_crawled   — URLs that were fully fetched, extracted, and persisted
 *   pages_failed    — URLs that resulted in a fetch/parse error
 *   pages_skipped   — URLs whose content was unchanged (incremental crawls)
 *   crawl_type      — 'first' | 'incremental'
 *   error_message   — top-level error if the whole job crashes
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ENUM for crawl_type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE crawl_job_type AS ENUM ('first', 'incremental');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.addColumn('crawl_jobs', 'pages_found', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('crawl_jobs', 'pages_crawled', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('crawl_jobs', 'pages_failed', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('crawl_jobs', 'pages_skipped', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('crawl_jobs', 'crawl_type', {
      type: 'crawl_job_type',
      allowNull: true
    });

    await queryInterface.addColumn('crawl_jobs', 'error_message', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('crawl_jobs', 'pages_found');
    await queryInterface.removeColumn('crawl_jobs', 'pages_crawled');
    await queryInterface.removeColumn('crawl_jobs', 'pages_failed');
    await queryInterface.removeColumn('crawl_jobs', 'pages_skipped');
    await queryInterface.removeColumn('crawl_jobs', 'crawl_type');
    await queryInterface.removeColumn('crawl_jobs', 'error_message');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS crawl_job_type;'
    );
  }
};
