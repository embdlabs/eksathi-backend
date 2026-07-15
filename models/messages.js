const { Sequelize, DataTypes } = require("sequelize");

const messages = (sequelize) => {
    return sequelize.define('messages', {
        id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        sender_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // Nullable to allow institute sender
            references: {
                model: 'users',
                key: 'id'
            },
        },
        receiver_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // Nullable to allow institute receiver
            references: {
                model: 'users',
                key: 'id'
            },
        },
        sender_institute_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // Nullable to allow user sender
            references: {
                model: 'institutes',
                key: 'id'
            },
        },
        receiver_institute_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // Nullable to allow user receiver
            references: {
                model: 'institutes',
                key: 'id'
            },
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false, // Message content cannot be null
        },
        time_to_send: {
            type: DataTypes.DATE,
            allowNull: true, // Can be null if no scheduled time is provided
        },
        room_id: {
            type: DataTypes.STRING, // This can hold both numbers and strings
            allowNull: false, // Cannot be null as it's used to identify the chat room
        }
    }, {
        sequelize,
        tableName: 'messages',
        timestamps: true, // Automatically adds `createdAt` and `updatedAt` timestamps
        indexes: [
            {
                name: "PRIMARY",
                unique: true,
                using: "BTREE",
                fields: [{ name: "id" }]
            },
            {
                name: "receiver_user_id",
                using: "BTREE",
                fields: [{ name: "receiver_user_id" }]
            },
            {
                name: "receiver_institute_id",
                using: "BTREE",
                fields: [{ name: "receiver_institute_id" }]
            },
            {
                name: "sender_user_id",
                using: "BTREE",
                fields: [{ name: "sender_user_id" }]
            },
            {
                name: "sender_institute_id",
                using: "BTREE",
                fields: [{ name: "sender_institute_id" }]
            },
            {
                name: "room_id",
                using: "BTREE", // Add index for frequent queries on room_id
                fields: [{ name: "room_id" }]
            }
        ]
    });
};

module.exports = messages;
