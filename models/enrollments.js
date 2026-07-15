const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('enrollments', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    enrollment_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'enrolled', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    application_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    enrollment_date: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded'),
      allowNull: true,
      defaultValue: 'pending'
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'enrollments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" }
        ]
      },
      {
        name: "unique_user_course",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "user_id" },
          { name: "course_id" }
        ]
      },
      {
        name: "enrollments_ibfk_1",
        using: "BTREE",
        fields: [
          { name: "course_id" }
        ]
      },
      {
        name: "enrollments_ibfk_2",
        using: "BTREE",
        fields: [
          { name: "user_id" }
        ]
      }
    ]
  });
};