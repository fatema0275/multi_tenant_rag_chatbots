'use strict';

/**
 * Migration 21 — Add OCR support to crawl_logs and pages tables
 *
 * 1. Extends enum_crawl_logs_status ENUM with:
 *    - 'success-ocr'
 *    - 'skipped-image-only'
 *    - 'success-ocr-image'
 *    - 'skipped-image-no-text'
 *
 * 2. Adds source_type column to pages table:
 *    - Stores 'html', 'pdf', 'pdf-ocr', or 'image-ocr'
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const newStatuses = [
      'success-ocr',
      'skipped-image-only',
      'success-ocr-image',
      'skipped-image-no-text'
    ];

    for (const val of newStatuses) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_crawl_logs_status"
        ADD VALUE IF NOT EXISTS '${val}';
      `);
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE pages
      ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'html';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('pages', 'source_type');
  }
};
