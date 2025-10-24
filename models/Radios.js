const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Radios = sequelize.define(
    "Radios",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        url: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                isUrl: true, // Validates that the URL is in correct format
            },
        },
        information: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        timestamps: false, // Disable automatic timestamps
    }
)

module.exports = Radios
