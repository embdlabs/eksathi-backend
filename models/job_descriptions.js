const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('job_descriptions', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    job_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'job_categories',
        key: 'id'
      }
    },
    institute_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'institutes',
        key: 'id'
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    job_title: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    job_description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    employment_type: {
      type: DataTypes.JSON,
      allowNull: false
    },
    work_schedule: {
      type: DataTypes.JSON,
      allowNull: false
    },
    salary_range: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    subjects: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    minimum_qualification: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    experience: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    job_location: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    vacancies: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    special_note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    short_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000) // Current date + 15 days in milliseconds
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired', 'renewed', 'cancelled'),
      allowNull: false,
      defaultValue: 'inactive'
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
    tableName: 'job_descriptions',
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
      {
        name: "job_category_id",
        using: "BTREE",
        fields: [
          { name: "job_category_id" },
        ]
      },
    ]
  });
};
