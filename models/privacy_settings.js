const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('privacy_settings', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    profile: {
      type: DataTypes.ENUM('public','connections','myself'),
      allowNull: false,
      defaultValue: "public"
    },
    email: {
      type: DataTypes.ENUM('public','connections','myself'),
      allowNull: false,
      defaultValue: "public"
    },
    avatar: {
      type: DataTypes.ENUM('public','connections','myself'),
      allowNull: false,
      defaultValue: "public"
    },
    country: {
      type: DataTypes.ENUM('public','connections','myself'),
      allowNull: false,
      defaultValue: "public"
    },
    bio: {
      type: DataTypes.ENUM('public','connections','myself'),
      allowNull: false,
      defaultValue: "public"
    },
    social_links: {
      type: DataTypes.ENUM('public','connections','myself'),
      allowNull: false,
      defaultValue: "public"
    },
    block_list: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'privacy_settings',
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
        name: "user_id",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
