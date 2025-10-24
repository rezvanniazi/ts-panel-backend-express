const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const AudioBots = require("../../../models/AudioBots")
const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const Users = require("../../../models/Users")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const Servers = require("../../../models/Servers")

module.exports = async (req, res) => {
    try {
        const { userId } = req.body

        const user = await Users.findByPk(userId)
        if (!user) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.USER.NOT_FOUND)
        }

        if (user.scope == "admin") {
            user.state = "suspended"
            return res.status(apiCodes.SUCCESS).json(responses.USER.SUSPENDED)
        }

        //////////// Suspend Audio Bots //////////////////////
        const audioBots = await AudioBots.findAll({ where: { bot_owner: user.username } })
        const panels = await MusicBotPanels.findAll()

        if (audioBots) {
            await Promise.all(
                audioBots.map((bot) => {
                    return new Promise(async (resolve) => {
                        const botPanel = panels.find((p) => p.id == bot.panel_id)
                        if (botPanel && panels.status == "online") {
                            await audioBotHelper.disconnect({ templateName: bot.template_name, panel: botPanel })
                        }
                        bot.status = "offline"
                        bot.state = "suspended"
                        await bot.save()

                        resolve()
                    })
                })
            )
        }
        /////////////////////////////////////////////////////////
        ////////////// Suspend Teamspeak Servers //////////////////
        const serverList = await Servers.findAll({ where: { author: user.username } })
        if (serverList) {
            await Promise.all(
                serverList.map(async (server) => {
                    return new Promise(async (resolve) => {
                        await teamspeakHelper.stop(server)

                        server.state = "suspended"
                        await server.save()

                        resolve()
                    })
                })
            )
        }

        user.state = "suspended"
        await user.save()

        return res.status(apiCodes.SUCCESS).json(responses.USER.SUSPENDED)
    } catch (err) {
        console.error("Error full suspending user: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
