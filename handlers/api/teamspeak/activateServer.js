const Servers = require("../../../models/Servers")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

const activateServer = async (req, res) => {
    const { serverId } = req.body
    const { scope, username } = req.user

    const userLogger = createLogger("user", req.user.id)

    const server = await Servers.findByPk(serverId)

    if (!server) {
        userLogger.error(`سرور با ایدی ${serverId} درخواست شده توسط ${req.user.username} پیدا نشد`)
        return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
    }
    if (scope == "reseller" && server.author !== username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    const serverLogger = createLogger("teamspeak", serverId)

    if (server.isExpired()) {
        serverLogger.error("فعال کردن با شکست مواجه شد(تمدید سرور اتمام شده است)")
        return res.status(apiCodes.EXPIRED).json(responses.TEAMSPEAK.EXPIRED)
    }

    // Activate Server
    teamspeakHelper.start(server)

    await server.update({ state: "active" })

    serverLogger.info("سرور با موفقیت فعال شد")
    return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.ACTIVATED)
}

module.exports = activateServer
