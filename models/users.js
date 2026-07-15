const { Sequelize, DataTypes } = require("sequelize");
const skills = require("./skills");
const rating = require("./ratings");
module.exports = function (sequelize) {
  const users = sequelize.define(
    "users",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: "username",
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: "email",
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(
          "admin",
          "moderator",
          "teacher",
          "student",
          "professional",
          "institute"
        ),
        allowNull: false,
        defaultValue: "student",
      },
      display_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      first_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      middle_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      location: {
        type: DataTypes.JSON,
      },
      phone: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue:
          "https://static.vecteezy.com/system/resources/previews/034/784/595/original/little-buddha-cartoon-character-meditation-on-lotus-flower-vector.jpg",
        // defaultValue: () => {
        //   const urls = [
        //     "https://img.freepik.com/premium-vector/monk-character-buddhist-religion-people-cartoon-illustration_201904-1659.jpg",
        //     "https://static.vecteezy.com/system/resources/previews/034/784/595/original/little-buddha-cartoon-character-meditation-on-lotus-flower-vector.jpg",
        //     "https://www.shutterstock.com/image-vector/drawn-cartoon-funny-character-monk-260nw-727320493.jpg"
        //   ];
        //   return urls[Math.floor(Math.random() * urls.length)];
        // }
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "inactive",
      },
      is_online: {
        type: DataTypes.ENUM("false", "true"),
        allowNull: false,
        defaultValue: "false",
      },
      show_contact_details: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      subject: {
        type: DataTypes.JSON,
      },
      teaching_method: {
        type: DataTypes.ENUM("online", "offline", "both"),
        defaultValue: "online",
      },
      qualification: {
        type: DataTypes.STRING(50),
        defaultValue: "M.Sc in Math",
      },
      experience: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
      },
      login_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      rating: {
        type: DataTypes.FLOAT,
        defaultValue: 4.3,
      },
      nearestLocation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
    },
    {
      sequelize,
      tableName: "users",
      timestamps: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "username",
          unique: true,
          using: "BTREE",
          fields: [{ name: "username" }],
        },
        {
          name: "email",
          unique: true,
          using: "BTREE",
          fields: [{ name: "email" }],
        },
      ],
    }
  );
  // users.hasMany(skills)
  // users.hasMany(rating)

  users.updateOnlineStatus = async function (userId, isActive) {
    try {
      await users.update(
        { status: isActive ? "true" : "false" },
        { where: { id: userId } }
      );
    } catch (error) {
      console.error("Error updating user online status:", error);
    }
  };

  return users;
};
