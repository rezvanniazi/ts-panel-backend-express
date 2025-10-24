const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const RanksystemSettings = sequelize.define(
    "RanksystemSettings",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        price: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 10000,
            validate: {
                min: 0, // Ensure price isn't negative
            },
        },
        backend_url: {
            type: DataTypes.STRING(45),
            allowNull: false,
            validate: {
                isUrl: true, // Validate URL format
            },
        },
        backend_token: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
    },
    {
        timestamps: false,
    }
)

module.exports = RanksystemSettings
