const fs = require("fs").promises
const path = require("path")

const AudioBots = require("../../../models/AudioBots")
const Servers = require("../../../models/Servers")
const TsManagerBots = require("../../../models/TsManagerBots")
const { createLogger } = require("../../../utils/logger")

const RESELLER_LOG_TYPES = ["managerBot", "teamspeak", "audiobot"]
const LOGS_FOLDER_PATH = path.join(process.cwd(), "logs")
const logHelper = require("../../../lib/utils/logHelper")

class LogsService {
    constructor(io) {
        if (!io) {
            throw new Error("Socket.io instance is required")
        }

        this.io = io
        this.activeLogsRoomUsers = new Map()
        this.activeUsers = new Map() // userId -> socket
        this.usersInfo = new Map() // userId -> {scope, ownedAudioBots, ownedTeamspeaks, ownedManagerbots}
        this.logger = createLogger("logsService", "service")
    }

    async sendLogFilesTree(socket) {
        const user = socket.request.user
        const userInfo = this.usersInfo.get(user?.id)

        if (!userInfo) {
            this.logger.error(`کاربر برای گرفتن فایل ها یافت نشد`)
        }

        let tree = []

        if (userInfo.scope === "admin") {
            let logsFolders = await fs.readdir(LOGS_FOLDER_PATH)

            for (let folder of logsFolders) {
                // Read log file list from every folders
                const result = await fs.readdir(path.join(LOGS_FOLDER_PATH, folder))
                const children = result.map((file) => ({
                    title: file,
                    key: `${folder}-${file.split(".")[0]}`,
                    isLeaf: true,
                }))

                tree.push({ title: folder, children: children })
            }
        } else {
            let logsFolders = RESELLER_LOG_TYPES

            for (let folder of logsFolders) {
                let result = await fs.readdir(path.join(LOGS_FOLDER_PATH, folder))

                if (folder == "audiobot") {
                    result = result.filter((file) => userInfo.ownedAudioBots.includes(file.split(".")[0]))
                } else if (folder == "teamspeak") {
                    result = result.filter((file) => userInfo.ownedTeamspeaks.includes(file.split(".")[0]))
                } else if (folder == "managerBot") {
                    result = result.filter((file) => userInfo.ownedManagerBots.includes(file.split(".")[0]))
                } else {
                    continue
                }

                const children = result.map((file) => ({
                    title: file,
                    key: `${folder}-${file.split(".")[0]}`,
                    isLeaf: true,
                }))
                tree.push({ title: folder, children: children })
            }
        }

        socket.emit("logFilesTree", tree)
    }

    async sendLogFileContent(socket, payload) {
        try {
            const { service, id } = payload
            const userInfo = this.usersInfo.get(socket.request.user.id)
            const CANT_READ_MESSAGE = "شما دسترسی لازم را ندارید"

            if (!userInfo) {
                socket.emit("logFileContent", { content: CANT_READ_MESSAGE })
            }
            let hasPermission = false

            if (userInfo.scope == "reseller") {
                switch (service) {
                    case "managerBot": {
                        hasPermission = userInfo.ownedManagerBots.find((botId) => botId == id) ? true : false
                    }
                    case "audioBot": {
                        hasPermission = userInfo.ownedAudioBots.find((botId) => botId == id) ? true : false
                    }
                    case "teamspeak": {
                        hasPermission = userInfo.ownedTeamspeaks.find((serverId) => serverId == id) ? true : false
                    }

                    default: {
                        hasPermission = false
                    }
                }
            } else if (userInfo.scope === "admin") {
                hasPermission = true
            }
            if (!hasPermission) {
                socket.emit("logFileContent", { content: CANT_READ_MESSAGE })
            }

            const { content } = await logHelper.readLogFile(service, id)

            socket.emit("logFileContent", { content })
        } catch (error) {
            if (error.message == "File not found") {
                socket.emit("logFileContent", { content: "لاگ مورد نظر یافت نشد" })
            } else {
                socket.emit("logFileContent", { content: "مشکلی در سرور بوجود امده است" })
            }
        }
    }

    logsRoomJoined(socket) {
        this.logger.info(`کاربر ${socket.request.user.username} شروع به خواندن لاگ کرد`)

        socket.on("getLogFilesTree", () => this.sendLogFilesTree(socket))
        socket.on("getLogContent", (payload) => this.sendLogFileContent(socket, payload))

        socket.emit("userJoined")
    }

    async initializeEvents(socket) {
        const { scope, username, id: userId } = socket.request.user

        let userInfo = { scope }

        userInfo.ownedAudioBots = (
            await AudioBots.findAll({
                where: { bot_owner: username },
                attributes: ["id"],
                raw: true,
            })
        ).map((item) => item.id.toString())

        userInfo.ownedManagerBots = (
            await TsManagerBots.findAll({
                where: { author: username },
                attributes: ["id"],
                raw: true,
            })
        ).map((item) => item.id.toString())

        userInfo.ownedTeamspeaks = (
            await Servers.findAll({
                where: { author: username },
                raw: true,
                attributes: ["id"],
            })
        ).map((item) => item.id.toString())

        this.usersInfo.set(userId, userInfo)

        socket.on("joinLogsRoom", () => this.logsRoomJoined(socket))
        socket.on("disconnectLogsRoom", () => this.removeUser(socket))
    }

    addUser(socket) {
        const { username, id } = socket.request.user

        try {
            // Remove existing user if present
            this.removeUser(socket)

            // Add new user
            this.activeUsers.set(id, socket)
            this.initializeEvents(socket)
        } catch (error) {
            this.logger.error(`Failed to add user ${username}: ${error.message}`)
        }
    }

    removeUser(socket) {
        const userId = socket.request.user.id

        try {
            const socket = this.activeUsers.get(userId)
            if (socket) {
                // Leave all teamspeak rooms
                this.activeUsers.delete(userId)
                this.usersInfo.delete(userId)

                this.logger.info(`کاربر ${socket.request.user.username} از لاگ ها امد بیرون`)
            }
        } catch (error) {
            this.logger.error(`Failed to remove user ${userId}: ${error.message}`)
        }
    }

    setupDisconnectHandler(socket) {
        socket.on("disconnect", () => {
            this.removeUser(socket)
        })
    }
}

module.exports = LogsService
