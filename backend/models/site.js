'use strict';

module.exports = (sequelize, DataTypes) => {
  const Site = sequelize.define(
    'Site',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      domain: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      crawl_status: {
        type: DataTypes.TEXT,
        defaultValue: 'pending',
      },
      last_crawled_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
      tableName: 'sites',
      timestamps: false,
    }
  );

  Site.associate = (models) => {
    Site.hasMany(models.Website, { foreignKey: 'site_id', as: 'websites' });
  };

  return Site;
};
