const { Sequelize, DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const institute_contacts = sequelize.define(
    "institute_contacts",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Change to true to allow null values
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL", // Set to NULL on delete
      },
      institute_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "institutes", // name of the table
          key: "id", // key in the referenced table
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      reply: {
        type: DataTypes.TEXT,
        allowNull: true, // Set to true if the reply can be null initially
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      tableName: "institute_contacts",
      timestamps: true,
    }
  );

  institute_contacts.associate = function (models) {
    institute_contacts.belongsTo(models.users, { foreignKey: "user_id" });
    institute_contacts.belongsTo(models.institutes, { foreignKey: "institute_id" });
  };

  return institute_contacts;
};
