'use strict';

module.exports = (sequelize, DataTypes) => {
  const ChatbotConfig = sequelize.define(
    'ChatbotConfig',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      website_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'websites',
          key: 'id',
        },
      },
      theme_color: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '#22C55E',
      },
      background_color: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '#ffffff',
      },
      text_color: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '#111111',
      },
      logo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      widget_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      embed_token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      overrides_locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      retrieval_threshold: {
        // Per-site retrieval similarity threshold (0.0-1.0).
        // null means use system default. Set to 0.55 to broaden retrieval.
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'chatbot_configs',
      timestamps: false,
    }
  );

  ChatbotConfig.associate = (models) => {
    ChatbotConfig.belongsTo(models.Website, { foreignKey: 'website_id', as: 'website' });
  };

  return ChatbotConfig;
};
