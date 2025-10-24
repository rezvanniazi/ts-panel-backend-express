const Servers = require("../../../models/Servers")
const UsedPorts = require("../../../models/UsedPorts")
const ServerPackages = require("../../../models/ServerPackages")
const logger = require("../../../utils/logger")
const { getCache, onCacheUpdate, offCacheUpdate } = require("../../../services/redis/cacheService")
const TeamspeakQueryService = require("./TeamspeakQueryService")

class TeamspeakService {
    constructor(io) {
        if (!io) {
            throw new Error("Socket.io instance is required")
        }
        this.io = io
        this.activeUsers = new Map() // userId -> socket
        this.logger = logger.createLogger("teamspeak", "service")
        this.cacheCallbacks = new Map() // Track registered callbacks for cleanup
        this.serverManagers = new Map() // userId -> serverId

        // Setup cache update listeners
        this.setupCacheListeners()
    }

    /**
     * Setup cache update listeners for server status changes
     */
    setupCacheListeners() {
        // Listen for server cache updates
        const serverCacheCallback = (key, newValue, oldValue) => {
            console.log(key, oldValue, newValue)
            if (JSON.stringify(newValue) === JSON.stringify(oldValue)) {
                return
            }
            this.logger.info(`Cache update detected for key: ${key}`)
            if (key.startsWith("teamspeak-")) {
                const serverId = key.replace("teamspeak-", "")
                this.logger.info(`Emitting server status update for server ${serverId}`)
                this.emitServerStatusUpdate(serverId, newValue, oldValue)
            }
        }

        // Register the callback for the prefix
        onCacheUpdate("teamspeak-", serverCacheCallback)
        this.cacheCallbacks.set("teamspeak-", serverCacheCallback)

        this.logger.info("Cache update listener registered for teamspeak- prefix")
    }

    /**
     * Emit server status update to connected clients
     */
    emitServerStatusUpdate(serverId, newValue, oldValue) {
        try {
            if (newValue && oldValue) {
                // Status changed
                this.io.to(`teamspeak-${serverId}`).emit("serverStatusUpdated", {
                    serverId,
                    status: newValue.status,
                    onlines: newValue.onlines,
                    previousStatus: oldValue.status,
                    previousOnlines: oldValue.onlines,
                })
            } else if (newValue && !oldValue) {
                // New status
                this.io.to(`teamspeak-${serverId}`).emit("serverStatusUpdated", {
                    serverId,
                    status: newValue.status,
                    onlines: newValue.onlines || 0,
                })
            } else if (!newValue && oldValue) {
                // Status deleted
                this.io.to(`teamspeak-${serverId}`).emit("serverStatusUpdated", {
                    serverId,
                    status: "offline",
                    onlines: 0,
                })
            }
        } catch (error) {
            this.logger.error(`Failed to emit server status update for ${serverId}: ${error.message}`)
        }
    }

    /**
     * Cleanup cache listeners
     */
    cleanup() {
        this.cacheCallbacks.forEach((callback, key) => {
            offCacheUpdate(key, callback)
        })
        this.cacheCallbacks.clear()
    }

    /**
     * Emit table changes to specific server room
     * @param {Object} row - Server data row
     * @param {number} row.id - Server ID
     */
    tableChanges = {
        create: (server) => {
            if (!server || !server.id) {
                this.logger.error("Invalid server data provided to tableChanges.create")
                return
            }

            this.io.to([`teamspeak-${server.author}`, "admin"]).emit("serverAdded", server)
        },
        update: (server) => {
            console.log("Updating")
            if (!server || !server.id) {
                this.logger.error("Invalid server data provided to tableChanges.update")
                return
            }
            this.io.to([`teamspeak-${server.id}`, "admin"]).emit("serverUpdated", server)
        },
        delete: (server) => {
            if (!server || !server.id) {
                this.logger.error("Invalid server data provided to tableChanges.delete")
                return
            }
            this.io
                .to([`teamspeak-${server.author}`, `teamspeak-${server.id}`, "admin"])
                .emit("serverDeleted", server.id)
        },
        // if (!row || !row.id) {
        //     this.logger.error("Invalid row data provided to tableChanges")
        //     return
        // }

        // try {
        //     this.io.to(`teamspeak-${row.id}`).emit("rowChanged", row)
        //     this.logger.info(`Table change emitted for server ${row.id}`)
        // } catch (error) {
        //     this.logger.error(`Failed to emit table change for server ${row.id}: ${error.message}`)
        // }
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
            this.setupServerQueryEvents(socket)
            this.setupServerEvents(socket)
            this.setupDisconnectHandler(socket)
            this.logger.info(`Events initialized for user: ${this.getUsername(socket)}`)
        } catch (error) {
            this.logger.error(`Failed to initialize events: ${error.message}`)
        }
    }

    /**
     * Join socket to server rooms
     * @param {Object} socket - Socket instance
     * @param {Array} servers - Array of server objects
     */
    joinRooms(socket, servers) {
        if (!socket || !Array.isArray(servers)) {
            this.logger.error("Invalid socket or servers array provided to joinRooms")
            return
        }

        try {
            const userId = this.getUserId(socket)
            const username = this.getUsername(socket)

            socket.join(`teamspeak-${username}`)

            let joinedCount = 1

            servers.forEach((server) => {
                if (server && server.id) {
                    socket.join(`teamspeak-${server.id}`)
                    joinedCount++
                }
            })

            this.logger.info(`User ${username} joined ${joinedCount} server rooms`)
        } catch (error) {
            this.logger.error(`Failed to join rooms: ${error.message}`)
        }
    }

    /**
     * Setup server-related socket events
     * @param {Object} socket - Socket instance
     */
    setupServerEvents(socket) {
        // Get server list event
        socket.on("getServerList", async () => {
            try {
                const user = socket.request.user
                const serverList = await this.fetchServerList(user)
                this.joinRooms(socket, serverList)
                socket.emit("serverList", serverList)

                this.logger.info(`Server list sent to user ${user.username} (${serverList.length} servers)`)
            } catch (error) {
                this.logger.error(`Failed to get server list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch server list",
                    error: error.message,
                })
            }
        })
        socket.on("getUsedPorts", async () => {
            try {
                const user = socket.request.user

                const usedPorts = await this.getUsedPorts(user)
                socket.emit("usedPortsList", usedPorts)
                this.logger.info(`Used ports sent to user ${user.username} (${usedPorts.length} ports)`)
            } catch (error) {
                this.logger.error(`Failed to get used ports: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch used ports",
                    error: error.message,
                })
            }
        })
        socket.on("getServerPackageList", async () => {
            try {
                const user = socket.request.user

                const serverPackageList = await this.getServerPackageList(user)
                socket.emit("serverPackageList", serverPackageList)
                this.logger.info(
                    `Server package list sent to user ${user.username} (${serverPackageList.length} packages)`
                )
            } catch (error) {
                this.logger.error(`Failed to get server package list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch server package list",
                    error: error.message,
                })
            }
        })
    }

    setupServerQueryEvents(socket) {
        const cred = socket.request.user

        socket.on("manage-server", async (payload) => {
            console.log("got")
            if (this.serverManagers.has(cred.id)) {
                return
            }
            const serverId = payload.serverId
            const server = await Servers.findByPk(serverId)
            if (cred.scope == "reseller" && server.author !== cred.username) {
                return
            }
            new TeamspeakQueryService(socket, server)

            this.serverManagers.set(cred.id, serverId)
        })
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
     * Fetch server list based on user scope
     * @param {Object} user - User object
     * @returns {Promise<Array>} Array of servers
     */
    async fetchServerList(user) {
        const { scope, username } = user
        let serverList

        try {
            if (scope === "reseller") {
                serverList = await Servers.findAll({
                    where: { author: username },
                    raw: true,
                })
            } else {
                serverList = await Servers.findAll({ raw: true })
            }

            if (Array.isArray(serverList)) {
                // Multiple records (findAll)
                for (let server of serverList) {
                    try {
                        const res = await getCache(`teamspeak-${server.id}`)
                        if (server && res) {
                            let serverOnlines = res.onlines || 0
                            server.slots = `${serverOnlines}/${server.slots}`
                            server.status = res.status || "offline"
                        } else if (server) {
                            // Set default values if no cache data
                            server.slots = `0/${server.slots}`
                            server.status = "offline"
                        }
                    } catch (cacheError) {
                        this.logger.warn(`Failed to get cache for server ${server.id}: ${cacheError.message}`)
                        // Set default values on cache error
                        if (server) {
                            server.slots = `0/${server.slots}`
                            server.status = "offline"
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Failed to fetch server list: ${error.message}`)
            throw error
        }

        return serverList
    }
    async getUsedPorts() {
        const usedPorts = await UsedPorts.findAll({ raw: true })
        return usedPorts.map((port) => port.port)
    }
    async getServerPackageList(user) {
        let serverPackageList

        if (user.scope == "admin") {
            serverPackageList = await ServerPackages.findAll({ raw: true })
        } else {
            serverPackageList = await ServerPackages.findAll({ where: { package_for_admin: false }, raw: true })
        }
        return serverPackageList
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
            this.setupCacheListeners()

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
                // Leave all teamspeak rooms
                this.leaveAllRooms(socket)
                this.activeUsers.delete(userId)
                this.serverManagers.delete(userId)
                TeamspeakQueryService.connectedServers.delete(socket.id)
                this.logger.info(`User ${socket.request.user.username} removed from active users`)
            }

            // Cleanup if no more active users
            if (this.activeUsers.size === 0) {
                this.cleanup()
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
                if (room.startsWith("teamspeak-")) {
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

module.exports = TeamspeakService
