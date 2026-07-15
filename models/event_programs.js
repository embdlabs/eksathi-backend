const { Sequelize, DataTypes } = require("sequelize");

const event_programs = (sequelize) => {
    return sequelize.define('event_programs', { // Table name should be 'event_programs'
        id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
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
        program: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
    }, {
        sequelize,
        tableName: 'event_programs', // Correct table name
        timestamps: true,
        indexes: [
            {
                name: "PRIMARY",
                unique: true,
                using: "BTREE",
                fields: [{ name: "id" }],
            },
            {
                name: "eventId", // Correct index for foreign key
                using: "BTREE",
                fields: [{ name: "eventId" }],
            },
        ],
    });
};

module.exports = event_programs;
