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

    // Create an array of all possible ports in random order
    const allPorts = Array.from({ length: maxPort - minPort + 1 }, (_, i) => minPort + i)

    // Shuffle the ports randomly
    for (let i = allPorts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[allPorts[i], allPorts[j]] = [allPorts[j], allPorts[i]]
    }

    // Try ports in random order
    for (const port of allPorts) {
        if (!usedPortSet.has(port)) {
            // Double-check by testing if the port is actually available
            if (await this.isPortAvailable(port)) {
                return port
            }
        }
    }

    throw new Error("No available ports found")
}

// Helper method to check if a port is actually available
UsedPorts.isPortAvailable = function (port) {
    return new Promise((resolve) => {
        const server = require("net").createServer()

        server.once("error", (err) => {
            if (err.code === "EADDRINUSE") {
                resolve(false) // Port is in use
            } else {
                resolve(false) // Other error, assume port not available
            }
        })

        server.once("listening", () => {
            server.close()
            resolve(true) // Port is available
        })

        server.listen(port)
    })
}

module.exports = UsedPorts
