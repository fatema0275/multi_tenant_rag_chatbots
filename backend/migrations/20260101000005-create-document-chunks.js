'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('document_chunks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      website_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'websites', key: 'id' },
        onDelete: 'CASCADE'
      },
      page_url: { type: Sequelize.TEXT },
      page_title: { type: Sequelize.STRING },
      chunk_text: { type: Sequelize.TEXT, allowNull: false },
      dom_selector: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // pgvector column — not a native Sequelize type, added via raw SQL
    await queryInterface.sequelize.query(`
      ALTER TABLE document_chunks ADD COLUMN embedding vector(384);
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('document_chunks');
  }
};
