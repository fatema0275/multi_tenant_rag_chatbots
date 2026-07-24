'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('query_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'messages', key: 'id' },
        onDelete: 'CASCADE'
      },
      retrieved_chunk_ids: { type: Sequelize.ARRAY(Sequelize.INTEGER) },
      similarity_scores: { type: Sequelize.ARRAY(Sequelize.FLOAT) },
      entailment_verdict: {
        type: Sequelize.ENUM('supported', 'contradicted', 'unsupported')
      },
      fallback_triggered: { type: Sequelize.BOOLEAN, defaultValue: false },
      fallback_reason: {
        type: Sequelize.ENUM('low_similarity', 'failed_entailment')
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('query_logs');
  }
};
