const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const ServerPackages = sequelize.define(
    "ServerPackages",
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
            validate: {
                notEmpty: true,
            },
        },
        package_slots: {
            type: DataTypes.INTEGER(20),
            allowNull: false,
            validate: {
                min: 1, // Ensure at least 1 slot
            },
        },
        package_days: {
            type: DataTypes.INTEGER(20),
            allowNull: true,
            validate: {
                min: 1, // If provided, must be at least 1 day
            },
        },
        package_amount: {
            type: DataTypes.INTEGER(20),
            allowNull: false,
            validate: {
                min: 0, // Prevent negative amounts
            },
        },
        package_description: {
            type: DataTypes.STRING(45),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        package_for_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
    },
    {
        timestamps: false,
        indexes: [
            {
                fields: ["package_amount"], // For sorting/filtering by price
            },
            {
                fields: ["package_for_admin"], // For admin/non-admin queries
            },
        ],
        hooks: {
            beforeValidate: (package) => {
                // Ensure consistent naming convention
                if (package.package_name) {
                    package.package_name = package.package_name.trim()
                }
            },
        },
    }
)

module.exports = ServerPackages
