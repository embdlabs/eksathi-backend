// models/Poll.js
const { DataTypes } = require("sequelize");
const sequelize = require("../model/connection");

const Poll = sequelize.define("Polls", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM("students", "teachers", "professionals"),
    allowNull: false,
    defaultValue: "students", // or any other default value you prefer
  },
});

module.exports = Poll;
