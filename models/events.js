const { Sequelize, DataTypes } = require("sequelize");

const events = (sequelize) => {
    return sequelize.define('events', {
        id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        institute_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "institutes",
                key: "id",
            },
        },
        instituteName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        coordinatorName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },
        contactNumber: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        eventStartDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        eventEndDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        registrationLink: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        chiefGuest: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        fees: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        award: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"), // Set to CURRENT_TIMESTAMP
        },

    }, {
        sequelize,
        tableName: 'events',
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
    });
};

module.exports = events;
