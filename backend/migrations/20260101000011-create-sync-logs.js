'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sync_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      website_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'websites', key: 'id' },
        onDelete: 'CASCADE'
      },
      pages_checked: { type: Sequelize.INTEGER, defaultValue: 0 },
      pages_updated: { type: Sequelize.INTEGER, defaultValue: 0 },
      pages_added: { type: Sequelize.INTEGER, defaultValue: 0 },
      pages_removed: { type: Sequelize.INTEGER, defaultValue: 0 },
      synced_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('sync_logs');
  }
};
