const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Servers = require("../../../models/Servers")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const { createLogger } = require("../../../utils/logger")

const stopServer = async (req, res) => {
    const { serverId } = req.body
    const { scope, username } = req.user

    const server = await Servers.findByPk(serverId)
    if (!server) return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)

    if (server.state === "suspended") return res.status(apiCodes.SUSPENDED).json(responses.TEAMSPEAK.NOT_ACTIVE)

    if (scope == "reseller" && server.author !== username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    const serverLogger = createLogger("teamspeak", serverId)
    serverLogger.info(`سرور ${server.server_port}-${server.query_port} توسط ${username} خاموش شد`)

    const stopRes = await teamspeakHelper.stop(server).catch((err) => {
        console.log(err.message)
        return null
    })

    if (!stopRes) {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }

    switch (stopRes?.status) {
        case "stopped":
            return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.STOP.SUCCESS)
        case "not_running":
            return res.status(apiCodes.NOT_RUNNING).json(responses.TEAMSPEAK.STOP.NOT_RUNNING)
        case "unknown":
            return res.status(apiCodes.UNKNOWN_RESPONSE).json(responses.TEAMSPEAK.STOP.UNKNOWN)

        default:
            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

module.exports = stopServer
