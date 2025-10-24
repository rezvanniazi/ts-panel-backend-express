const https = require("https")
const http = require("http")
const { Server } = require("socket.io")
const { swaggerUi, specs } = require("./addons/swagger")
const { instrument } = require("@socket.io/admin-ui")

const app = require("./app")
const config = require("./config")
const socketAuth = require("./middleware/auth").socketAuth
const { socketCooldowns } = require("./middleware/socketCooldown")
const socketController = require("./services/socket/socketController")
const fs = require("fs")
const TeamspeakController = require("./handlers/socket/teamspeak/TeamspeakController")
const AudiobotController = require("./handlers/socket/audiobot/AudiobotController")
const UserController = require("./handlers/socket/user/UserController")
const ManagerbotController = require("./handlers/socket/managerbot/ManagerbotController")
const JobManager = require("./jobs")
const { default: axios } = require("axios")
const ManagerBotPanels = require("./models/ManagerBotPanels")
const { ManagerBotPanel } = require("./lib/managerBot/ManagerBotPanel")

class SocketServer {
    constructor() {
        if (process.env.NODE_ENV == "development") {
            this.server = http.createServer(app)
        } else {
            const certOptions = {
                key: fs.readFileSync("./certs/privkey.pem"),
                cert: fs.readFileSync("./certs/fullchain.pem"),
            }

            this.server = https.createServer(certOptions, app)
        }

        this.io = new Server(this.server, {
            cors: {
                origin: "*",
            },
            connectionStateRecovery: {
                maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
                skipMiddlewares: true,
            },
        })
        this.initializeMiddlewares()
        this.initializeAdminUI()
        this.initializeControllers()
        this.initializeManagerBotPanels()
        this.initializeCronjobs()
        this.initializeErrorHandling()
    }

    initializeCronjobs() {
        const jobManager = new JobManager(this.io)
        jobManager.startAlljobs()
    }

    initializeMiddlewares() {
        // JWT Authentication middleware
        this.io.engine.use(socketAuth)

        // Socket cooldown middleware
        this.io.use(socketCooldowns.default)

        // Additional middlewares can be added here
        this.io.use((socket, next) => {
            // Example: Logging middleware
            console.log(`Socket connection attempt from ${socket.handshake.address}`)
            next()
        })
    }

    initializeAdminUI() {
        if (config.socketAdmin.enabled) {
            instrument(this.io, {
                namespaceName: "/socketadmin",
                auth: false,
                mode: process.env.NODE_ENV || "development",
            })
        }
    }

    initializeControllers() {
        this.socketService = socketController(this.io)
        this.teamspeakService = TeamspeakController(this.io)
        this.audiobotService = AudiobotController(this.io)
        this.userService = UserController(this.io)
        this.managerbotService = ManagerbotController(this.io)
        // Make socket service globally accessible
        global.socketService = this.socketService
        global.teamspeakService = this.teamspeakService
        global.audiobotService = this.audiobotService
        global.userService = this.userService
        global.managerbotService = this.managerbotService
    }

    async initializeManagerBotPanels() {
        const panels = await ManagerBotPanels.findAll()
        panels.forEach((p) => {
            new ManagerBotPanel(p)
        })
    }

    initializeErrorHandling() {
        this.io.on("connection_error", (err) => {
            console.error("Socket connection error:", err.message)
        })

        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err)
            // Consider proper shutdown in production
        })

        process.on("unhandledRejection", (err) => {
            console.error("Unhandled Rejection:", err)
        })
    }

    start() {
        this.server.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`)
            console.log(`Socket.IO admin UI available at /socketadmin`)
        })

        return this.server
    }
}

const socketServer = new SocketServer()
module.exports = socketServer.start()
