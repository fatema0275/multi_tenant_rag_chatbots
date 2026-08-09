'use strict';

/**
 * Migration 14 — Create `pages` table
 *
 * This table is the central content store for crawled pages.  Each row
 * represents one unique URL belonging to a website.  The crawl module
 * upserts rows here; the embedding module reads rows where
 * `needs_embedding = TRUE` and writes back the embedding to
 * `document_chunks`.
 *
 * Columns not present in any prior migration (all new):
 *   id, website_id, url, title, raw_text, content_hash,
 *   crawl_status, needs_embedding, http_etag, http_last_modified,
 *   last_crawled_at, created_at
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ENUM type must be created before the table when using raw Postgres.
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE page_crawl_status AS ENUM ('active', 'removed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('pages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      website_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'websites', key: 'id' },
        onDelete: 'CASCADE'
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      raw_text: {
        // Clean text extracted by trafilatura — no HTML, no boilerplate.
        type: Sequelize.TEXT,
        allowNull: true
      },
      content_hash: {
        // MD5 hex digest of raw_text; used to detect content changes
        // without a full text comparison.
        type: Sequelize.STRING(32),
        allowNull: true
      },
      crawl_status: {
        type: 'page_crawl_status',
        defaultValue: 'active'
      },
      needs_embedding: {
        // Set TRUE when raw_text is new or changed.
        // The embedding pipeline (Module 3) reads this flag and resets it.
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      http_etag: {
        // Last seen ETag response header — used for lightweight change
        // detection in incremental crawls (HEAD request first).
        type: Sequelize.TEXT,
        allowNull: true
      },
      http_last_modified: {
        // Last seen Last-Modified response header — used as a fallback
        // change-detection signal when ETag is absent.
        type: Sequelize.TEXT,
        allowNull: true
      },
      last_crawled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Unique constraint: one row per (website_id, url) pair.
    await queryInterface.addIndex('pages', ['website_id', 'url'], {
      unique: true,
      name: 'pages_website_url_unique'
    });

    // Index for the embedding pipeline to quickly find dirty pages.
    await queryInterface.addIndex('pages', ['website_id', 'needs_embedding'], {
      name: 'pages_needs_embedding_idx'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pages');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS page_crawl_status;'
    );
  }
};
