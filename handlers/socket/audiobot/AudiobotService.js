const AudioBots = require("../../../models/AudioBots")
const BotPackages = require("../../../models/BotPackages")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const Radios = require("../../../models/Radios")

const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")

const logger = require("../../../utils/logger")

class AudiobotService {
    constructor(io) {
        if (!io) {
            throw new Error("Socket.io instance is required")
        }
        this.io = io
        this.activeUsers = new Map() // userId -> socket
        this.logger = logger.createLogger("audiobot", "service")
    }

    tableChanges = {
        create: (bot) => {
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.create")
                return
            }
            this.io.to([`audiobot-${bot.bot_owner}`, "admin"]).emit("botAdded", bot)
        },
        update: (bot) => {
            console.log("Updating")
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.update")
                return
            }
            this.io.to([`audiobot-${bot.id}`, "admin"]).emit("botUpdated", bot)
        },
        delete: (bot) => {
            if (!bot || !bot.id) {
                this.logger.error("Invalid bot data provided to tableChanges.delete")
                return
            }
            this.io.to([`audiobot-${bot.id}`, "admin"]).emit("botDeleted", bot.id)
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
            this.setupAudiobotEvents(socket)
            this.setupDisconnectHandler(socket)
            this.logger.info(`Events of AudioBot initialized for user: ${this.getUsername(socket)}`)
        } catch (error) {
            this.logger.error(`Failed to initialize events: ${error.message}`)
        }
    }
    /**
     * Join socket to Audiobot rooms
     * @param {Object} socket - Socket instance
     * @param {Array} botList - Array of bot objects
     */
    joinRooms(socket, botList) {
        if (!socket || !Array.isArray(botList)) {
            this.logger.error("Invalid socket or bots array provided to joinRooms")
            return
        }

        try {
            const username = this.getUsername(socket)

            socket.join(`audiobot-${username}`)

            let joinedCount = 1

            botList.forEach((bot) => {
                if (bot && bot.id) {
                    socket.join(`audiobot-${bot.id}`)
                    joinedCount++
                }
            })

            this.logger.info(`User ${username} joined ${joinedCount} bot rooms`)
        } catch (error) {
            this.logger.error(`Failed to join rooms: ${error.message}`)
        }
    }
    /**
     * Setup Audiobot-related socket events
     * @param {Object} socket - Socket instance
     */
    setupAudiobotEvents(socket) {
        const user = socket.request.user
        // Get bot list event
        socket.on("getBotList", async () => {
            try {
                const user = socket.request.user

                const botList = await this.fetchbotList(user)
                this.joinRooms(socket, botList)
                socket.emit("botList", botList)

                this.logger.info(`bot list sent to user ${user.username} (${botList.length} bots)`)
            } catch (error) {
                this.logger.error(`Failed to get bot list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch bot list",
                    error: error.message,
                })
            }
        })

        socket.on("changeVolume", async (payload) => {
            const { templateName, volume } = payload
            const { username, scope } = socket.request.user

            const bot = await AudioBots.findOne({ where: { template_name: templateName } })

            if (scope === "reseller" && bot.author !== username) return

            const panel = await MusicBotPanels.findByPk(bot.panel_id)

            if (!panel || panel.status === "offline") return

            await audioBotHelper.changeVolume({ templateName, volume: Math.floor(volume), panel })
        })

        socket.on("getBotPackageList", async () => {
            try {
                const user = socket.request.user

                const botPackageList = await this.getBotPackageList(user)
                socket.emit("botPackageList", botPackageList)
                this.logger.info(`Bot package list sent to user ${user.username} (${botPackageList.length} packages)`)
            } catch (error) {
                this.logger.error(`Failed to get audiobot package list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch audiobot package list",
                    error: error.message,
                })
            }
        })
        socket.on("getRadioList", async () => {
            try {
                const user = socket.request.user

                const radioList = await this.getRadioList(user)
                socket.emit("radioList", radioList)
                this.logger.info(`Radio List list sent to user ${user.username} (${radioList.length} Radios)`)
            } catch (error) {
                this.logger.error(`Failed to get audiobot package list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch audiobot package list",
                    error: error.message,
                })
            }
        })

        if (user.scope == "admin") {
            socket.on("getPanelList", async () => {
                try {
                    const user = socket.request.user

                    const panelList = await this.getBotPanelList(user)
                    socket.emit("panelList", panelList)
                    this.logger.info(`Bot panel list sent to user ${user.username} (${panelList.length} panels)`)
                } catch (error) {
                    this.logger.error(`Failed to get server package list: ${error.message}`)
                    socket.emit("error", {
                        message: "Failed to fetch server package list",
                        error: error.message,
                    })
                }
            })
        }
    }

    /**
     * Setup disconnect handler
     * @param {Object} socket - Socket instance
     */
    setupDisconnectHandler(socket) {
        socket.on("disconnect", () => {
            const user = socket.request.user

            this.removeUser(user.id)
            this.logger.info(`User ${user.username} disconnected`)
        })
    }

    /**
     * Fetch bot list based on user scope
     * @param {Object} user - User object
     * @returns {Promise<Array>} Array of bots
     */
    async fetchbotList(user) {
        const { scope, username } = user
        let botList

        try {
            if (scope === "reseller") {
                botList = await AudioBots.findAll({
                    where: { bot_owner: username },
                    raw: true,
                })
            } else {
                botList = await AudioBots.findAll({ raw: true })
            }
            const panelList = await MusicBotPanels.findAll({ raw: true })

            if (Array.isArray(botList)) {
                botList = botList.map((b) => {
                    const p = panelList.find((p) => p.id == b.panel_id)

                    b.panel_name = p?.name || "Unknown"
                    b.panel_status = p?.status || "offline"
                    return b
                })
            }
        } catch (error) {
            this.logger.error(`Failed to fetch bot list: ${error.message}`)
            throw error
        }

        return botList
    }

    async getBotPackageList() {
        const botPackgeList = await BotPackages.findAll({ raw: true })
        return botPackgeList
    }
    async getBotPanelList() {
        const botPanelList = await MusicBotPanels.findAll({ raw: true })
        return botPanelList
    }
    async getRadioList() {
        const radioList = await Radios.findAll({ raw: true })
        return radioList
    }

    /**
     * Add user to active users and initialize events
     * @param {string} userId - User ID
     * @param {Object} socket - Socket instance
     */
    addUser(userId, socket) {
        const username = this.getUsername(socket)
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
        const socket = this.activeUsers.get(userId)

        try {
            if (socket) {
                // Leave all teamspeak rooms
                const username = this.getUsername(socket)
                this.leaveAllRooms(socket)
                this.activeUsers.delete(userId)
                this.logger.info(`User ${username} removed from active users`)
            }
        } catch (error) {
            this.logger.error(`Failed to remove user ${userId}: ${error.message}`)
        }
    }

    /**
     * Leave all teamspeak rooms for a socket
     * @param {Object} socket - Socket instance
     */
    leaveAllRooms(socket) {
        if (!socket) return

        try {
            const rooms = Array.from(socket.rooms || [])
            rooms.forEach((room) => {
                if (room.startsWith("audiobot-")) {
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

module.exports = AudiobotService
