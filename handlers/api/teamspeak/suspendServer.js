const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Servers = require("../../../models/Servers")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const { createLogger } = require("../../../utils/logger")

const suspendServer = async (req, res) => {
    try {
        const { serverId } = req.body

        const server = await Servers.findByPk(serverId)

        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        await teamspeakHelper.stop(server).catch((err) => {
            console.log(err.message)
        })

        await server.update({ state: "suspended" })
        const serverLogger = createLogger("teamspeak", serverId)
        serverLogger.info(`سرور توسط ${req.user.username} غیرفعال شد`)

        return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.SUSPENDED)
    } catch (err) {
        console.error("Error suspending server", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

module.exports = suspendServer
