// models/subject.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Subject = sequelize.define(
    "Subject",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      subject_name: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      class_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      course_name:{
        type:DataTypes.STRING,
        allowNull:false
      }
    },
    {
      tableName: "subjects",
      timestamps: true,
    }
  );

  return Subject;
};
