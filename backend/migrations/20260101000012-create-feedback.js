'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('feedback', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'messages', key: 'id' },
        onDelete: 'CASCADE'
      },
      rating: { type: Sequelize.ENUM('up', 'down'), allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('feedback');
  }
};
