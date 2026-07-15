const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('reports', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    item_type: {
      type: DataTypes.ENUM('question','answer','comment','reply'),
      allowNull: false
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reason: {
      type: DataTypes.ENUM('spam','offensive','inappropriate','duplicate','other'),
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    action: {
      type: DataTypes.ENUM('delete','none'),
      allowNull: false,
      defaultValue: "none"
    },
    status: {
      type: DataTypes.ENUM('pending','resolved','dismissed'),
      allowNull: false,
      defaultValue: "pending"
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
    tableName: 'reports',
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
        name: "user_id",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "item_type",
        using: "BTREE",
        fields: [
          { name: "item_type" },
          { name: "item_id" },
        ]
      },
    ]
  });
};
