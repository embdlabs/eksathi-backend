const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "tutors",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING(15),
        allowNull: false,
      },
      subject: {
        type: DataTypes.JSON, // Changed to JSON to store array of subjects
        allowNull: false,
        defaultValue: [], // Default empty array
        get() {
          const rawValue = this.getDataValue('subject');
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          this.setDataValue('subject', JSON.stringify(value));
        }
      },
      class: {
        type: DataTypes.JSON, // JSON to store array of classes
        allowNull: false,
        defaultValue: [], // Default empty array
        get() {
          const rawValue = this.getDataValue('class');
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          this.setDataValue('class', JSON.stringify(value));
        }
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "India",
      },
      isValid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // by default not validated
      },
      connectionStatus: {
        type: DataTypes.ENUM('process', 'pending', 'completed'),
        defaultValue: 'pending'
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
      tableName: "tutors",
      timestamps: false, // if you want Sequelize to handle timestamps automatically, set this to true and remove createdAt/updatedAt fields
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "email_unique",
          unique: true,
          using: "BTREE",
          fields: [{ name: "email" }],
        },
      ],
    }
  );
};