const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const ManagerBotPanels = sequelize.define(
    "ManagerBotPanels",
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
        host: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        token: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        max_bot: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
        },
        in_use_count: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "offline",
        },
    },
    {
        timestamps: false, // Disable automatic timestamps
    }
)

module.exports = ManagerBotPanels
