const AudiobotController = require("../../handlers/socket/audiobot/AudiobotController")
const TeamspeakController = require("../../handlers/socket/teamspeak/TeamspeakController")
const UserController = require("../../handlers/socket/user/UserController")
const ManagerbotController = require("../../handlers/socket/managerbot/ManagerbotController")
const LogsController = require("../../handlers/socket/logsService/LogsController")
const RanksystemController = require("../../handlers/socket/ranksystem/RanksystemController")

class SocketService {
    constructor(io) {
        this.io = io
        this.teamspeakService = TeamspeakController(io)
        this.audiobotService = AudiobotController(io)
        this.userService = UserController(io)
        this.managerbotService = ManagerbotController(io)
        this.ranksystemService = RanksystemController(io)

        this.logsService = LogsController(io)
        this.activeUsers = new Map()
        this.initializeServices()
    }

    /**
     * Initialize socket events
     */
    initializeServices() {
        this.io.on("connection", (socket) => {
            const user = socket.request.user
            const connectedUser = user?.username
            console.log("New client connected:")
            if (connectedUser) {
                socket.join(connectedUser)
            }
            if (user?.canUseServers || user?.scope == "admin") {
                this.teamspeakService.addUser(user.id, socket)
            }
            if (user?.canUseAudioBot || user?.scope == "admin") {
                this.audiobotService.addUser(user.id, socket)
            }
            if (user?.canUseManagerBot || user?.scope == "admin") {
                this.managerbotService.addUser(user.id, socket)
            }
            if (user?.canUseRanksystems || user?.scope == "admin") {
                this.ranksystemService.addUser(user.id, socket)
            }
            if (user?.scope == "admin") {
                socket.join("admin")
                this.userService.addUser(user.id, socket)
            }

            this.logsService.addUser(socket)

            socket.on("disconnect", () => {
                this.removeUser(socket)
                console.log("User disconnected: ", connectedUser)
            })
        })
    }

    /**
     * Add user to active users
     * @param {string} userId - User identifier
     * @param {object} socket - Socket object
     */
    addUser(userId, socket) {
        if (userId) {
            this.activeUsers.set(userId, socket.id)
        }
    }

    /**
     * Remove user from active users
     * @param {object} socket - Socket object
     */
    removeUser(socket) {
        for (let [userId, id] of this.activeUsers.entries()) {
            if (id === socket.id) {
                this.activeUsers.delete(userId)
                break
            }
        }
    }

    /**
     * Get user socket by userId
     * @param {string} userId - User identifier
     * @returns {string|null} Socket ID
     */
    getUser(userId) {
        return this.activeUsers.get(userId)
    }

    /**
     * Emit service operation event to all clients
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    emitServiceEvent(event, data) {
        this.io.emit(event, data)
    }

    /**
     * Emit service operation event to specific service room
     * @param {string} serviceType - Service type
     * @param {string} serviceId - Service identifier
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    emitToServiceRoom(serviceType, serviceId, event, data) {
        this.io.to(`${serviceType}-${serviceId}`).emit(event, data)
    }
    emitToRoom(room, event, data) {
        this.io.to(room).emit(event, data)
    }

    /**
     * Emit service operation event to service type room
     * @param {string} serviceType - Service type
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    emitToServiceTypeRoom(serviceType, event, data) {
        this.io.to(`service-${serviceType}`).emit(event, data)
    }
}

module.exports = SocketService
