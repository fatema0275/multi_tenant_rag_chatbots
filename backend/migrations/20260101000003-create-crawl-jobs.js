'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('crawl_jobs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      website_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'websites', key: 'id' },
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('queued', 'running', 'completed', 'failed'),
        defaultValue: 'queued'
      },
      started_at: { type: Sequelize.DATE },
      completed_at: { type: Sequelize.DATE }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('crawl_jobs');
  }
};
