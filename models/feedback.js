// models/feedback.js
const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "feedback",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      category: {
        type: DataTypes.ENUM(
          'General Feedback',
          'Bug Report',
          'Feature Request',
          'User Experience',
          'Performance',
          'Other'
        ),
        allowNull: false,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'resolved'),
        allowNull: false,
        defaultValue: 'pending',
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      sequelize,
      tableName: "feedback",
      timestamps: false,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "user_id_index",
          using: "BTREE",
          fields: [{ name: "user_id" }],
        },
        {
          name: "category_index",
          using: "BTREE",
          fields: [{ name: "category" }],
        },
        {
          name: "status_index",
          using: "BTREE",
          fields: [{ name: "status" }],
        },
      ],
    }
  );
};