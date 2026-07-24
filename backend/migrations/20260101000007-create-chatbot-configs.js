'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chatbot_configs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      website_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'websites', key: 'id' },
        onDelete: 'CASCADE'
      },
      theme_color: { type: Sequelize.STRING },
      logo_url: { type: Sequelize.TEXT },
      widget_settings: { type: Sequelize.JSONB, defaultValue: {} },
      deployed_at: { type: Sequelize.DATE }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('chatbot_configs');
  }
};
