'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add role column to users table if it doesn't exist
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'user'
      });
    }

    // Ensure all existing users have role set to 'user' if null
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'user' WHERE role IS NULL;
    `);
  },

  down: async (queryInterface) => {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.role) {
      await queryInterface.removeColumn('users', 'role');
    }
  }
};
