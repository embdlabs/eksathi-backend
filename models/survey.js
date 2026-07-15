const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('survey', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    target_classes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    target_subjects: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    target_locations: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    rating: {
      type: DataTypes.DECIMAL(3,1),
      allowNull: true
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    questions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
   status: {
  type: DataTypes.ENUM(
    'draft',
    'published',
    'expired',
    'closed',
    'archived'
  ),
  allowNull: false,
  defaultValue: 'draft'
},
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    sequelize,
    tableName: 'surveys',
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
        name: "created_by",
        using: "BTREE",
        fields: [
          { name: "created_by" },
        ]
      },
      {
        name: "is_active",
        using: "BTREE",
        fields: [
          { name: "is_active" },
        ]
      },
      {
        name: "start_date",
        using: "BTREE",
        fields: [
          { name: "start_date" },
        ]
      },
      {
        name: "end_date",
        using: "BTREE",
        fields: [
          { name: "end_date" },
        ]
      }
    ]
  });
};