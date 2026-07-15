const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "institute_profiles",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      institute_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "institutes",
          key: "id",
        },
      },
      eksathi_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      aboutYou: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ownername: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "India",
      },
      postal_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      establishmentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      facebook: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      github: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      instagram: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      instituteRegistrationNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      landmark: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      linkdin: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      pocdesignation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pocemail: {
        type: DataTypes.STRING,
        allowNull: true,
        // validate: {
        //   isEmail: true,
        // },
      },
      pocname: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pocphone: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      twitter: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      youtube: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
      },
      location: {
        type: DataTypes.GEOMETRY("POINT"),
      },
      votes: {
        type: DataTypes.INTEGER,
        // allowNull: false,
        defaultValue: 0,
      },
      rating: {
        type: DataTypes.INTEGER,
        // allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "institute_profiles",
      timestamps: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "institute_id",
          using: "BTREE",
          fields: [{ name: "institute_id" }],
        },
      ],
    }
  );
};
