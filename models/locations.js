const { Sequelize, DataTypes } = require("sequelize");

const locations = (sequelize, DataTypes) => {
  return sequelize.define('locations', {
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
    city_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pincode: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    area: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'locations',
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` timestamps
    
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

module.exports = locations;