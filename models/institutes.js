const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('institutes', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    logo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // defaultValue: "https:\/\/eksathii.cjabpdnepjmp.ap-south-1.rds.amazonaws.com\/public\/images\/default_institute_logo.jpg"
      defaultValue: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5oJVJTFpZozCqbbLzzKW-MKnhwl9SINNCjA&s"
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "username"
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "email"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    mobile: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    database_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    auth_verification_path: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    // gender:{
    //    type:DataTypes.ENUM('male','female','other'),
    //    default:'male',
    //    allowNull:false,
    // },
    status: {
      type: DataTypes.ENUM('Verification','Onboarding','Active', 'Inactive', 'On-Hold', 'Suspended', 'Re-Verification'),
      allowNull: false,
      defaultValue: "Verification"
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
    tableName: 'institutes',
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
        name: "username",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
        ]
      },
      {
        name: "email",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
    ]
  });
};
