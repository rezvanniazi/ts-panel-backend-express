const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const CompanyList = sequelize.define(
    "CompanyList",
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
            unique: true,
        },
        domain_name: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        domain_zone_id: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        cloudf_token: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        domain_ip: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "0.0.0.0",
        },
    },
    {
        timestamps: false, // Disable automatic createdAt/updatedAt
    }
)

module.exports = CompanyList
