const TsManagerBots = require("../../../models/TsManagerBots")
const Permissions = require("../../../models/Permissions")

const logger = require("../../../utils/logger")

class ManagerbotService {
    constructor(io) {
        if (!io) {
            throw new Error("Socket.io instance is required")
        }
        this.io = io
        this.activeUsers = new Map() // userId -> socket
        this.logger = logger.createLogger("managerBot", "service")
    }

    /**
     * Emit table changes to specific bot room
     * @param {Object} row - bot data row
     * @param {number} row.id - bot ID
     */
    tableChanges = {
        create: (bot) => {
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.create")
                return
            }
            this.io.to([`managerbot-${bot.author}`, "admin"]).emit("managerBotAdded", bot)
        },
        update: (bot) => {
            console.log("Updating")
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.update")
                return
            }
            this.io.to([`managerbot-${bot.id}`, "admin"]).emit("managerBotUpdated", bot)
        },
        delete: (bot) => {
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.delete")
                return
            }
            this.io.to([`managerbot-${bot.id}`, "admin"]).emit("managerBotDeleted", bot.id)
        },
    }

    /**
     * Initialize socket events for a user
     * @param {Object} socket - Socket instance
     */
    initializeEvents(socket) {
        if (!socket) {
            this.logger.error("Socket instance is required for event initialization")
            return
        }

        try {
            this.setupBotEvents(socket)
            this.setupDisconnectHandler(socket)
            this.logger.info(`Events initialized for user: ${this.getUserId(socket)}`)
        } catch (error) {
            this.logger.error(`Failed to initialize events: ${error.message}`)
        }
    }

    /**
     * Join socket to bot rooms
     * @param {Object} socket - Socket instance
     * @param {Array} bots - Array of bot objects
     */
    joinRooms(socket, bots) {
        if (!socket || !Array.isArray(bots)) {
            this.logger.error("Invalid socket or bots array provided to joinRooms")
            return
        }

        try {
            const userId = this.getUserId(socket)
            const username = this.getUsername(socket)

            socket.join(`managerbot-${username}`)

            let joinedCount = 1

            bots.forEach((bot) => {
                if (bot && bot.id) {
                    socket.join(`managerbot-${bot.id}`)
                    joinedCount++
                }
            })

            this.logger.info(`User ${userId} joined ${joinedCount} bot rooms`)
        } catch (error) {
            this.logger.error(`Failed to join rooms: ${error.message}`)
        }
    }

    /**
     * Setup bot-related socket events
     * @param {Object} socket - Socket instance
     */
    setupBotEvents(socket) {
        // Get bot list event
        socket.on("getManagerBotList", async () => {
            try {
                const user = socket.request.user
                const botList = await this.fetchBotList(user)
                this.joinRooms(socket, botList)
                socket.emit("managerBotList", botList)

                this.logger.info(`Bot list sent to user ${user.username} (${botList.length} bots)`)
            } catch (error) {
                this.logger.error(`Failed to get bot list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch bot list",
                    error: error.message,
                })
            }
        })
        socket.on("getPermList", async () => {
            try {
                const user = socket.request.user
                const permList = await this.fetchPermList(user)
                socket.emit("permList", permList)

                this.logger.info(`Perm list send to user ${user.username} (${permList.length}) permissions`)
            } catch (error) {
                this.logger.error("Failed to get permission list: ", error.message)
                socket.emit("error", {
                    message: "Failed to fetch permission list",
                    error: error.message,
                })
            }
        })
        // socket.on("getUsedPorts", async () => {
        //     try {
        //         const user = socket.request.user

        //         const usedPorts = await this.getUsedPorts(user)
        //         socket.emit("usedPortsList", usedPorts)
        //         this.logger.info(`Used ports sent to user ${user.username} (${usedPorts.length} ports)`)
        //     } catch (error) {
        //         this.logger.error(`Failed to get used ports: ${error.message}`)
        //         socket.emit("error", {
        //             message: "Failed to fetch used ports",
        //             error: error.message,
        //         })
        //     }
        // })
        // socket.on("getServerPackageList", async () => {
        //     try {
        //         const user = socket.request.user

        //         const serverPackageList = await this.getServerPackageList(user)
        //         socket.emit("serverPackageList", serverPackageList)
        //         this.logger.info(
        //             `Server package list sent to user ${user.username} (${serverPackageList.length} packages)`
        //         )
        //     } catch (error) {
        //         this.logger.error(`Failed to get server package list: ${error.message}`)
        //         socket.emit("error", {
        //             message: "Failed to fetch server package list",
        //             error: error.message,
        //         })
        //     }
        // })
    }

    /**
     * Setup disconnect handler
     * @param {Object} socket - Socket instance
     */
    setupDisconnectHandler(socket) {
        socket.on("disconnect", () => {
            const userId = this.getUserId(socket)
            this.removeUser(userId)
            this.logger.info(`User ${userId} disconnected`)
        })
    }

    /**
     * Fetch bot list based on user scope
     * @param {Object} user - User object
     * @returns {Promise<Array>} Array of bots
     */
    async fetchBotList(user) {
        const { scope, username } = user
        let botList

        try {
            if (scope === "reseller") {
                botList = await TsManagerBots.findAll({
                    where: { author: username },
                    raw: true,
                })
            } else {
                botList = await TsManagerBots.findAll({ raw: true })
            }
        } catch (error) {
            this.logger.error(`Failed to fetch bot list: ${error.message}`)
            throw error
        }

        return botList
    }
    async fetchPermList(user) {
        try {
            const permList = await Permissions.findAll({ raw: true })

            return permList
        } catch (error) {
            this.logger.error(`Failed to fetch perm list: ${error.message}`)
            throw error
        }
    }

    /**
     * Add user to active users and initialize events
     * @param {string} userId - User ID
     * @param {Object} socket - Socket instance
     */
    addUser(userId, socket) {
        const username = socket.request.user.username
        if (!userId || !socket) {
            this.logger.error("User ID and socket are required for addUser")
            return
        }

        try {
            // Remove existing user if present
            this.removeUser(userId)

            // Add new user
            this.activeUsers.set(userId, socket)
            this.initializeEvents(socket)

            this.logger.info(`User ${username} added to active users`)
        } catch (error) {
            this.logger.error(`Failed to add user ${username}: ${error.message}`)
        }
    }

    /**
     * Remove user from active users
     * @param {string} userId - User ID
     */
    removeUser(userId) {
        if (!userId) return

        try {
            const socket = this.activeUsers.get(userId)
            if (socket) {
                // Leave all managerbot rooms
                this.leaveAllRooms(socket)
                this.activeUsers.delete(userId)
                this.logger.info(`User ${userId} removed from active users`)
            }
        } catch (error) {
            this.logger.error(`Failed to remove user ${userId}: ${error.message}`)
        }
    }

    /**
     * Leave all managerbot rooms for a socket
     * @param {Object} socket - Socket instance
     */
    leaveAllRooms(socket) {
        if (!socket) return

        try {
            const rooms = Array.from(socket.rooms || [])
            rooms.forEach((room) => {
                if (room.startsWith("managerbot-")) {
                    socket.leave(room)
                }
            })
        } catch (error) {
            this.logger.error(`Failed to leave rooms: ${error.message}`)
        }
    }

    /**
     * Get active users count
     * @returns {number} Number of active users
     */
    getActiveUsersCount() {
        return this.activeUsers.size
    }

    getUserId(socket) {
        return socket.request.user.id
    }

    getUsername(socket) {
        return socket.request.user.username
    }

    getSocket(userId) {
        return this.activeUsers.get(userId)
    }

    /**
     * Get all active users
     * @returns {Array} Array of active user IDs
     */
    getActiveUsers() {
        return Array.from(this.activeUsers.keys())
    }

    /**
     * Check if user is active
     * @param {string} userId - User ID
     * @returns {boolean} True if user is active
     */
    isUserActive(userId) {
        return this.activeUsers.has(userId)
    }
}

module.exports = ManagerbotService
