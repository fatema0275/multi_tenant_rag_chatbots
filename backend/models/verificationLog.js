'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VerificationLog extends Model {
    static associate(models) {
      VerificationLog.belongsTo(models.Website, {
        foreignKey: 'website_id',
        as: 'website'
      });
      VerificationLog.belongsTo(models.User, {
        foreignKey: 'verified_by_user_id',
        as: 'verifiedBy'
      });
    }
  }

  VerificationLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      website_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      method: {
        type: DataTypes.ENUM('dns', 'self_attested'),
        allowNull: false
      },
      verified_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      verified_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'VerificationLog',
      tableName: 'verification_logs',
      timestamps: false
    }
  );

  return VerificationLog;
};
