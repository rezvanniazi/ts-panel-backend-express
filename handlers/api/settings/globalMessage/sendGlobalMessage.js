const Servers = require("../../../../models/Servers")
const { sendMessageToServer } = require("../../../../lib/teamspeak/teamspeakQuery")
const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const { createLogger } = require("../../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { scope, username } = req.user
        const { msg } = req.body

        let servers
        // Fetch servers
        if (scope === "admin") {
            servers = await Servers.findAll()
        } else if (scope === "reseller") {
            servers = await Servers.findAll({ where: { author: username } })
        }
        // Send message to all servers with promise
        await Promise.all(
            servers.map((srv) => {
                return sendMessageToServer(srv.server_port, srv.query_port, srv.query_password, msg)
            })
        )

        const userLogger = createLogger("user", req.user.id)
        userLogger.info(`پیام سراسری توسط ${username} ارسال شد - تعداد سرورها: ${servers.length}`)
        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        console.error("Error sending global message: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
