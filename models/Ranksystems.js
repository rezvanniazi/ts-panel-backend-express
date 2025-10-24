const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Ranksystems = sequelize.define(
    "Ranksystems",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        template_name: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        expires: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        autorenew: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        username: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING(45),
            allowNull: false,
            // Consider adding encryption in hooks
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        author: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
    },
    {
        timestamps: false, // Since we have our own created field
    }
)

module.exports = Ranksystems
