'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('websites', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      domain: { type: Sequelize.STRING, allowNull: false },
      verification_token: { type: Sequelize.STRING },
      verification_status: {
        type: Sequelize.ENUM('pending', 'verified', 'failed'),
        defaultValue: 'pending'
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('websites');
  }
};
