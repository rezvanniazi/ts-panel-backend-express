const { DataTypes } = require("sequelize")
const { sequelize, Op } = require("../config/database")

const UsedPorts = sequelize.define(
    "UsedPorts",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        port: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                isPort(value) {
                    if (value && (value < 1 || value > 65535)) {
                        throw new Error("Port must be between 1 and 65535")
                    }
                },
            },
        },
    },
    {
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ["port"],
            },
        ],
    }
)

UsedPorts.isValid = async function (port) {
    const usedPorts = await this.findAll({
        attributes: ["port"],

        raw: true,
    })

    const usedPortSet = new Set(usedPorts.map((p) => p.port))

    return !usedPortSet.has(port)
}

// Class method to find available port
UsedPorts.findAvailable = async function () {
    const usedPorts = await this.findAll({
        attributes: ["port"],

        raw: true,
    })
    const usedPortSet = new Set(usedPorts.map((p) => p.port))
    const minPort = 4000 // Start above well-known ports
    const maxPort = 8000

    for (let port = minPort; port <= maxPort; port++) {
        if (!usedPortSet.has(port)) {
            return port
        }
    }

    throw new Error("No available ports found")
}

module.exports = UsedPorts
