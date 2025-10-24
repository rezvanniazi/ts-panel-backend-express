const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const MusicBotPanels = sequelize.define(
    "MusicBotPanels",
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
        panel_type: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "normal",
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

module.exports = MusicBotPanels
