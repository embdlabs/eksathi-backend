const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('api_credentials', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    institute_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'institutes',
        key: 'id'
      }
    },
    alias: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    api_secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    api_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), // Set to CURRENT_TIMESTAMP
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), // Set to CURRENT_TIMESTAMP
    },
  }, {
    sequelize,
    tableName: 'api_credentials',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "institute_id",
        using: "BTREE",
        fields: [
          { name: "institute_id" },
        ]
      },
    ]
  });
};
