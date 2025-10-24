const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Servers = require("../../../models/Servers")
const { getCache } = require("../../../services/redis/cacheService")

const getServer = async (req, res) => {
    const { serverId, serverport } = req.query

    let server
    if (serverId) {
        server = await Servers.findByPk(serverId)
    } else if (serverport) {
        server = await Servers.findOne({ where: { server_port: serverport }, raw: true })
    }

    if (!server || (req.user.scope !== "admin" && server.author !== req.user.username)) {
        return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
    }

    const serverCache = await getCache(`teamspeak-${server.id}`)

    server.status = serverCache.status || "offline"
    server.onlines = serverCache.onlines || 0

    return res.status(apiCodes.SUCCESS).json(server)
}

module.exports = getServer
