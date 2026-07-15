const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "admissions",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      admission_id: {
        type: DataTypes.INTEGER,
        
      },
      institute_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "institutes", // Ensure the model name is correct
          key: "id",
        },
      },
      course_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "active",
          "finish",
          "hold"
        ),
        allowNull: false,
        defaultValue: "hold",
      },
      duration: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      batch_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      course_duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      seats: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fees: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      last_date: {
        // Updated field name for clarity
        type: DataTypes.DATE,
        allowNull: false,
      },
      course_mode: {
        type: DataTypes.JSON, // Use JSON to allow multiple values
        allowNull: false,
      },
      course_type: {
        type: DataTypes.JSON, // Use JSON to allow multiple values
        allowNull: false,
      },
      is_enrolled: {
  type: DataTypes.BOOLEAN, 
  allowNull: false,
  defaultValue: false, 
},

enroll_user_id: {
  type: DataTypes.JSON,  
  allowNull: true,
},




      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW,
      },
    },
    {
      tableName: "admissions", // Specify the table name
      underscored: true, // Use snake_case for column names in the database
    }
  );
};
