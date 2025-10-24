const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const BotPackages = sequelize.define(
    "BotPackages",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        package_name: {
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: true,
        },
        package_days: {
            type: DataTypes.INTEGER(20),
            allowNull: true,
        },
        package_amount: {
            type: DataTypes.INTEGER(20),
            allowNull: false,
        },
        package_description: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        package_for_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        package_bot_type: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "normal",
        },
    },
    {
        timestamps: false, // Disable automatic createdAt/updatedAt fields
    }
)

module.exports = BotPackages
