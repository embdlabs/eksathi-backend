const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('notifications', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    // Foreign key for receiver being a user
    receiver_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    // Foreign key for receiver being an institute
    receiver_institute_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'institutes',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    // Foreign key for sender being a user
    sender_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    // Foreign key for sender being an institute
    sender_institute_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'institutes',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    notification_type: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    message: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
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
    tableName: 'notifications',
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
        name: "receiver_user_id",
        using: "BTREE",
        fields: [
          { name: "receiver_user_id" },
        ]
      },
      {
        name: "receiver_institute_id",
        using: "BTREE",
        fields: [
          { name: "receiver_institute_id" },
        ]
      },
      {
        name: "sender_user_id",
        using: "BTREE",
        fields: [
          { name: "sender_user_id" },
        ]
      },
      {
        name: "sender_institute_id",
        using: "BTREE",
        fields: [
          { name: "sender_institute_id" },
        ]
      },
    ]
  });
};
