const Servers = require("../../../models/Servers")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const responses = require("../../../constants/responses")
const apiCodes = require("../../../constants/apiCodes")
const { createLogger } = require("../../../utils/logger")

const startServerBulk = async (req, res) => {
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
                if (s.state == "suspended") return resolve()
                await teamspeakHelper.start(s).catch((err) => {
                    console.log("Couldn't start server with id of", s.id, err.message)
                })
                const serverLogger = createLogger("teamspeak", s.id)
                serverLogger.info(`سرور ${s.server_port}-${s.query_port} توسط ${username} روشن شد`)

                resolve()
            })
        })
    )

    return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.START.SUCCESS)
}

module.exports = startServerBulk
