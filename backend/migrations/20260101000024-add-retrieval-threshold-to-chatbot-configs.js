'use strict';

/**
 * Migration: add retrieval_threshold float column to chatbot_configs.
 *
 * This column lets site owners tune the retrieval similarity cutoff per site
 * without code changes. The retrieve_chunks() function in backend/services/retrieval.js
 * reads this value at query time and uses it in place of the global default.
 *
 * Default: NULL (use system default from tenants.similarity_threshold or 0.30).
 * Typical use: SET to 0.55 for a site after a fresh crawl to widen the retrieval
 * window while content is still being quality-checked.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('chatbot_configs');
    if (!tableInfo.retrieval_threshold) {
      await queryInterface.addColumn('chatbot_configs', 'retrieval_threshold', {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: null,
        comment: 'Per-site retrieval similarity threshold (0.0-1.0). Overrides system default when set.',
      });
      console.log('[Migration 24] Added retrieval_threshold to chatbot_configs');
    } else {
      console.log('[Migration 24] retrieval_threshold already exists in chatbot_configs, skipping');
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('chatbot_configs');
    if (tableInfo.retrieval_threshold) {
      await queryInterface.removeColumn('chatbot_configs', 'retrieval_threshold');
    }
  },
};
