'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('verification_logs', {
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
      method: {
        type: Sequelize.ENUM('dns', 'self_attested'),
        allowNull: false
      },
      verified_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      verified_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('verification_logs');
  }
};
