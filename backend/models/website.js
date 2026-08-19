'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Website extends Model {
    static associate(models) {
      Website.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      Website.belongsTo(models.Site, {
        foreignKey: 'site_id',
        as: 'site'
      });
      Website.hasMany(models.VerificationLog, {
        foreignKey: 'website_id',
        as: 'verificationLogs',
        onDelete: 'CASCADE'
      });
      Website.hasOne(models.ChatbotConfig, {
        foreignKey: 'website_id',
        as: 'chatbotConfig',
        onDelete: 'CASCADE'
      });
    }
  }

  Website.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      site_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      domain: {
        type: DataTypes.STRING,
        allowNull: false
      },
      verification_token: {
        type: DataTypes.STRING,
        allowNull: true
      },
      verification_status: {
        type: DataTypes.ENUM('pending', 'verified', 'failed'),
        defaultValue: 'pending'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'Website',
      tableName: 'websites',
      timestamps: false
    }
  );

  return Website;
};
