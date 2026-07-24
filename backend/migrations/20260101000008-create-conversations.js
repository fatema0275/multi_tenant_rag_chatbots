'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('conversations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      website_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'websites', key: 'id' },
        onDelete: 'CASCADE'
      },
      visitor_session_id: { type: Sequelize.STRING, allowNull: false },
      started_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('conversations');
  }
};
