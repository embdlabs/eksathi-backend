const { Sequelize, DataTypes } = require("sequelize");

const event_registerUser = (sequelize) => {
    return sequelize.define('event_registerUser', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        eventId: { // Foreign key to Events
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'events', // Refers to the 'Events' table
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        profile: {
            type: DataTypes.STRING,
            allowNull: true, // Profile picture is optional
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
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
        tableName: 'event_registerUser',
        timestamps: true,
        indexes: [
            {
                name: "PRIMARY",
                unique: true,
                using: "BTREE",
                fields: [{ name: "id" }],
            },
            {
                name: "user_id", // Renamed index for 'user_id'
                using: "BTREE",
                fields: [{ name: "user_id" }],
            },
            {
                name: "eventId", // Renamed index for 'eventId'
                using: "BTREE",
                fields: [{ name: "eventId" }],
            },
        ],
    });
};

module.exports = event_registerUser;