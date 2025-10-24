const Servers = require("../../../models/Servers")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const responses = require("../../../constants/responses")
const apiCodes = require("../../../constants/apiCodes")
const { createLogger } = require("../../../utils/logger")

const stopServerBulk = async (req, res) => {
    const { scope, username } = req.user
    const { selecteds } = req.body
    let servers

    if (scope == "admin") {
        servers = await Servers.findAll()
    } else {
        servers = await Servers.findAll({ where: { author: username } })
    }
    if (selecteds) {
        servers = servers.filter((s) => {
            return selecteds.includes(s.id)
        })
    }

    await Promise.all(
        servers.map((s) => {
            return new Promise(async (resolve, reject) => {
                await teamspeakHelper.stop(s).catch((err) => {
                    console.log("Couldn't stop server with id of", s.id, err.message)
                })
                const serverLogger = createLogger("teamspeak", s.id)
                serverLogger.info(`سرور توسط ${username} خاموش شد`)
                resolve()
            })
        })
    )

    return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.STOP.SUCCESS)
}

module.exports = stopServerBulk
