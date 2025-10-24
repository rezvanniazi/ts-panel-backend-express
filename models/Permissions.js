const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Permissions = sequelize.define(
    "Permissions",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        price: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
        },
        desc: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: "desc", // Explicitly map to the 'desc' column in the database
        },
        multi: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: false, // Disable automatic createdAt/updatedAt
    }
)

module.exports = Permissions
