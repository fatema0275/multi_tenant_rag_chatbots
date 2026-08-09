'use strict';

/**
 * Migration 16 — Extend `crawl_logs` table to match task specification
 *
 * The existing `crawl_logs` table (migration 004) has:
 *   id, crawl_job_id, url, status ENUM('success','failed','excluded_robots'),
 *   reason, content_hash, crawled_at
 *
 * Changes made here (all 🚩 flagged as missing from the original schema):
 *
 *   1. Extend the `status` ENUM with new values required by the task:
 *        robots_disallowed, timeout, duplicate, skipped_unchanged, removed
 *      (PostgreSQL ADD VALUE is backward-compatible; existing rows are unaffected)
 *
 *   2. Add `page_url` column (task uses this name; existing `url` is kept for
 *      backward compatibility — a view or the service can alias it).
 *      🚩 `page_url` is the column name the crawl service writes to.
 *
 *   3. Add `error_reason` column (task uses this name; existing `reason` kept).
 *      🚩 `error_reason` is the column name the crawl service writes to.
 *
 * NOTE: We do NOT drop the original `url` and `reason` columns because existing
 * data and the Sequelize migration history still reference them.  The Python
 * crawl service will write to `page_url` and `error_reason` only.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Extend the status ENUM — PostgreSQL requires ALTER TYPE ADD VALUE.
    //    ADD VALUE is safe to run multiple times when guarded by IF NOT EXISTS
    //    (available since Postgres 12).
    const newStatuses = [
      'robots_disallowed',
      'timeout',
      'duplicate',
      'skipped_unchanged',
      'removed'
    ];

    for (const value of newStatuses) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_crawl_logs_status"
        ADD VALUE IF NOT EXISTS '${value}';
      `);
    }

    // 2. Add page_url column (🚩 new column, task-required name)
    await queryInterface.addColumn('crawl_logs', 'page_url', {
      type: Sequelize.TEXT,
      allowNull: true   // nullable for backward compat with existing rows
    });

    // 3. Add error_reason column (🚩 new column, task-required name)
    await queryInterface.addColumn('crawl_logs', 'error_reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('crawl_logs', 'page_url');
    await queryInterface.removeColumn('crawl_logs', 'error_reason');
    // NOTE: Postgres does not support removing ENUM values; rollback of the
    // ENUM extension is intentionally omitted to avoid data loss risk.
  }
};
