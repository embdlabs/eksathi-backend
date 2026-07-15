const { Sequelize, DataTypes } = require("sequelize");

const Teachers = (sequelize) => {
  return sequelize.define(
    "Teachers",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subject: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      class: {
        type: DataTypes.STRING,
        allowNull: false,
      },
       qualification :{
        type:DataTypes.STRING(50),
        defaultValue:"M.Sc in Math"
      },
       experience:{
        type:DataTypes.NUMBER,
        defaultValue:2
      },
       rating:{
        type:DataTypes.FLOAT,
        defaultValue:4.3
      },
      contact_info: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
      votes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      state:{
        type: DataTypes.STRING,
        allowNull: false,
      }
    },
    {
      tableName: "Teachers",
      timestamps: true,
    }
  );
};

module.exports = Teachers;