const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "categories",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(500),
        allowNull: true,
        unique: "slug",
      },
      icon: {
        type: DataTypes.STRING(400),
        allowNull: true,
      },
      alt_tag: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
    },
    {
      sequelize,
      tableName: "categories",
      timestamps: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "slug",
          unique: true,
          using: "BTREE",
          fields: [{ name: "slug" }],
        },
      ],
    }
  );
};
