const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Servers = sequelize.define(
    "Servers",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        state: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "active",
            validate: {
                isIn: [["active", "suspended"]], // Example states
            },
        },
        server_port: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isPort: true, // Validates port range (1-65535)
            },
        },
        query_port: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isPort: true,
            },
        },
        file_port: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isPort: true,
            },
        },
        query_password: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        author: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        slots: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1, // At least 1 slot required
            },
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        expires: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        version: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        info: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        package_name: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        subdomain_record_id: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        subdomain_name: {
            type: DataTypes.STRING(45),
            allowNull: true,
            validate: {
                is: /^[a-z0-9\-]+$/i, // Basic subdomain format validation
            },
        },
        autorenew: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: false, // Using custom created field
        paranoid: true, // Enables soft deletion
        indexes: [
            {
                fields: ["state"], // For filtering by state
            },
            {
                fields: ["author"], // For user-specific queries
            },
            {
                fields: ["expires"], // For expiration checks
            },
            {
                unique: true,
                fields: ["server_port", "query_port", "file_port"], // Port uniqueness
            },
        ],
        hooks: {
            afterCreate: (server) => {
                const svc = global.teamspeakService
                console.log(server)
                if (svc) {
                    svc.tableChanges.create({ ...server.dataValues, status: "online" })
                }
            },
            afterUpdate: (server) => {
                const svc = global.teamspeakService
                if (svc) {
                    svc.tableChanges.update(server)
                }
            },
            afterDestroy: (server) => {
                const svc = global.teamspeakService
                if (svc) {
                    svc.tableChanges.delete(server)
                }
            },
            beforeValidate: (server) => {
                // Trim string fields
                if (server.subdomain_name) {
                    server.subdomain_name = server.subdomain_name.toLowerCase().trim()
                }
            },
        },
    }
)

Servers.prototype.isExpired = function () {
    return this.expires && new Date(this.expires) < new Date()
}

module.exports = Servers
