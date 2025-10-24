const CompanyList = require("../../../models/CompanyList")
const Users = require("../../../models/Users")

const logger = require("../../../utils/logger")

class UserService {
    constructor(io) {
        if (!io) {
            throw new Error("Socket.io instance is required")
        }
        this.io = io
        this.activeUsers = new Map() // userId -> socket
        this.logger = logger.createLogger("user", "service")
    }

    tableChanges = {
        create: (user) => {
            if (!user || !user.id) {
                this.logger.error("Invalid user data provided to tableChanges.create")
                return
            }
            this.io.to(["admin"]).emit("userAdded", user)
        },
        update: (user) => {
            if (!user || !user.id) {
                this.logger.error("Invalid user data provided to tableChanges.update")
                return
            }
            this.io.to([user.username, "admin"]).emit("userUpdated", user.dataValues)
        },
        delete: (user) => {
            if (!user || !user.id) {
                this.logger.error("Invalid user data provided to tableChanges.delete")
                return
            }
            this.io.to(["admin"]).emit("userDeleted", user.id)
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
            this.setupUsersEvents(socket)
            this.setupDisconnectHandler(socket)
            this.logger.info(`Events of UserList initialized for user: ${this.getUserId(socket)}`)
        } catch (error) {
            this.logger.error(`Failed to initialize events: ${error.message}`)
        }
    }
    /**
     * Join socket to UserList rooms
     * @param {Object} socket - Socket instance
     * @param {Array} botList - Array of user objects
     */

    /**
     * Setup User-related socket events
     * @param {Object} socket - Socket instance
     */
    setupUsersEvents(socket) {
        const user = socket.request.user
        // Get user list event
        socket.on("getUserList", async () => {
            try {
                const user = socket.request.user

                const userList = await this.fetchUserList(user)
                socket.emit("userList", userList)

                this.logger.info(`User list sent to user ${user.username} (${userList.length} Users)`)
            } catch (error) {
                this.logger.error(`Failed to get user list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch user list",
                    error: error.message,
                })
            }
        })
        socket.on("getCompanyList", async () => {
            try {
                const user = socket.request.user

                const companyList = await this.fetchCompanyList(user)
                socket.emit("companyList", companyList)

                this.logger.info(`Company list sent to user ${user.username} (${companyList.length} Companys)`)
            } catch (error) {
                this.logger.error(`Failed to get company list: ${error.message}`)
                socket.emit("error", {
                    message: "Failed to fetch company list",
                    error: error.message,
                })
            }
        })
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
     * Fetch user list based on user scope
     * @param {Object} user - User object
     * @returns {Promise<Array>} Array of Users
     */
    async fetchUserList() {
        try {
            const userList = await Users.findAll({ raw: true })

            return userList
        } catch (error) {
            this.logger.error(`Failed to fetch user list: ${error.message}`)
            throw error
        }
    }
    async fetchCompanyList() {
        try {
            const companyList = await CompanyList.findAll({ raw: true })

            return companyList
        } catch (err) {
            this.logger.error(`Failed to fetch user list: ${err.message}`)
            throw err
        }
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
                this.activeUsers.delete(userId)
                this.logger.info(`User ${username} removed from active users`)
            }
        } catch (error) {
            this.logger.error(`Failed to remove user ${userId}: ${error.message}`)
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

module.exports = UserService
