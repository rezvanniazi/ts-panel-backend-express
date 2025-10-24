const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Servers = require("../../../models/Servers")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const { createLogger } = require("../../../utils/logger")

const restartServer = async (req, res) => {
    const { serverId } = req.body
    const { scope, username } = req.user

    const server = await Servers.findByPk(serverId)
    if (!server) return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)

    if (server.state === "suspended") return res.status(apiCodes.SUSPENDED).json(responses.TEAMSPEAK.NOT_ACTIVE)

    if (scope == "reseller" && server.author !== username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    const serverLogger = createLogger("teamspeak", serverId)
    serverLogger.info(`سرور توسط ${username} ریستارت شد`)

    await teamspeakHelper.stop(server).catch(null)

    const restartRes = await teamspeakHelper.start(server).catch((err) => {
        console.log("Couldn't start server with id of", s.id, err.message)
    })

    if (!restartRes) {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }

    switch (restartRes?.status) {
        case "started":
            return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.RESTART.SUCCESS)

        case "unknown":
            return res.status(apiCodes.UNKNOWN_RESPONSE).json(responses.TEAMSPEAK.RESTART.UNKNOWN)

        default:
            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

module.exports = restartServer
