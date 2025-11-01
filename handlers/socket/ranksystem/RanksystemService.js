const logger = require("../../../utils/logger")
const Ranksystems = require("../../../models/Ranksystems")
const RanksystemSettings = require("../../../models/RanksystemSettings")

class RanksystemService {
    constructor(io) {
        if (!io) {
            throw new Error("Socket.io instance is required")
        }
        this.io = io
        this.activeUsers = new Map()
        this.logger = logger.createLogger("ranksystem", "service")
    }

    tableChanges = {
        create: (bot) => {
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.create")
                return
            }
            this.io.to([`ranksystem-${bot.author}`, "admin"]).emit("ranksystemAdded", bot)
        },
        update: (bot) => {
            console.log("Updating")
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.update")
                return
            }
            this.io.to([`ranksystem-${bot.id}`, "admin"]).emit("ranksystemUpdated", bot)
        },
        delete: (bot) => {
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.delete")
                return
            }
            this.io.to([`ranksystem-${bot.id}`, "admin"]).emit("ranksystemDeleted", bot.id)
        },
    }

    initializeEvents(socket) {
        if (!socket) {
            this.logger.error("Socket instance is reuqired for event initialization")
            return
        }

        try {
            this.setupBotEvents(socket)
            this.setupDisconnectHandler(socket)
            this.logger.info("Events initialized for user: ", this.getUsername(socket))
        } catch (err) {
            console.error(err.message)
            this.logger.error("Failed to initialize events")
        }
    }

    joinRooms(socket, bots) {
        if (!socket || !Array.isArray(bots)) {
            this.logger.error("Invalid socket or bots array provided to joinRooms")
            return
        }

        try {
            const username = this.getUsername(socket)

            socket.join(`ranksystem-${username}`)

            let joinedCount = 1

            bots.forEach((bot) => {
                if (bot && bot.id) {
                    socket.join(`ranksystem-${bot.id}`)
                    joinedCount++
                }
            })
        } catch (err) {
            console.error(err.message)
            this.logger.error("Failed to join rooms for user: ", this.getUsername(socket))
        }
    }

    setupBotEvents(socket) {
        // Get bot list event
        socket.on("getRanksystemList", async () => {
            try {
                const user = socket.request.user
                const botList = await this.fetchBotList(user)
                this.joinRooms(socket, botList)
                socket.emit("ranksystemList", botList)

                this.logger.info(`Bot list sent to user ${user.username} (${botList.length} bots)`)
            } catch (err) {
                console.error(err.message)
                this.logger.error("Failed to fetch bot list for user: ", this.getUsername(socket))
            }
        })
        socket.on("getRanksystemPrice", async (_, cb) => {
            const settings = await RanksystemSettings.findOne({ raw: true })

            socket.emit("ranksystemPrice", settings ? settings.price : null)
        })

        socket.on("validateTemplateName", async (payload) => {
            const { templateName } = payload

            const templateNameInUse = await Ranksystems.findOne({ where: { template_name: templateName }, raw: true })

            socket.emit("templateNameValidation", { templateName, isValid: !templateNameInUse })
        })
    }

    setupDisconnectHandler(socket) {
        socket.on("disconnect", () => {
            const userId = this.getUserId(socket)
            this.removeUser(userId)
            this.logger.info("User disconnected from ranksystem: ", this.getUsername(socket))
        })
    }

    async fetchBotList(user) {
        const { scope, username } = user
        let botList

        try {
            if (scope == "admin") {
                botList = await Ranksystems.findAll({ raw: true })
            } else {
                botList = await Ranksystems.findAll({ where: { author: username }, raw: true })
            }
        } catch (err) {
            console.error(err.message)
            this.logger.error("Database error fetching ranksystem list for user: ", username)
        }

        return botList || []
    }

    addUser(userId, socket) {
        const username = socket.request.user.username
        if (!userId || !socket) {
            this.logger.error("Invalid userId or socket provided to addUser")
            return
        }

        try {
            // Remove existing user if present
            this.removeUser(userId)

            // Add a new user
            this.activeUsers.set(userId, socket)
            this.initializeEvents(socket)

            this.logger.info("User added to ranksystem service: ", username)
        } catch (err) {
            console.error(err.message)
            this.logger.error("Failed to add user to ranksystem service: ", username)
        }
    }

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

    getUserId(socket) {
        return socket.request.user.id
    }

    getUsername(socket) {
        return socket.request.user.username
    }

    getSocket(userId) {
        return this.activeUsers.get(userId)
    }
}

module.exports = RanksystemService
