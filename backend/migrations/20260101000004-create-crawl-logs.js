'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('crawl_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      crawl_job_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'crawl_jobs', key: 'id' },
        onDelete: 'CASCADE'
      },
      url: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'excluded_robots'),
        allowNull: false
      },
      reason: { type: Sequelize.TEXT },
      content_hash: { type: Sequelize.STRING },
      crawled_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('crawl_logs');
  }
};
