const apiCodes = require("../../../constants/apiCodes")
const Servers = require("../../../models/Servers")
const { getCache } = require("../../../services/redis/cacheService")

const getServerList = async (req, res) => {
    const { username, scope } = req.user
    let serverList

    if (scope === "reseller") {
        serverList = await Servers.findAll({ where: { author: username } })
    } else {
        serverList = await Servers.findAll()
    }

    for (let server of serverList) {
        const serverCache = await getCache(`teamspeak-${server.id}`)

        server.status = serverCache.status || "offline"
        server.onlines = serverCache.onlines || 0
    }

    return res.status(apiCodes.SUCCESS).json(serverList)
}

module.exports = getServerList
