const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const AudioBots = require("../../../models/AudioBots")
const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const Users = require("../../../models/Users")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const Servers = require("../../../models/Servers")
const { createLogger, clearLog } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { userId } = req.body

        const user = await Users.findByPk(userId)
        const userLogger = createLogger("user", req.user.id)

        if (!user) {
            userLogger.error(`کاربر با ایدی ${userId} توسط ${req.user.username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.USER.NOT_FOUND)
        }

        if (user.scope == "admin") {
            userLogger.error(`تلاش برای حذف ادمین ${user.username} توسط ${req.user.username}`)
            await user.destroy()
            return res.status(apiCodes.SUCCESS).json(responses.USER.DELETED)
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
                            await audioBotHelper.delete({ templateName: bot.template_name, panel: botPanel })
                        }
                        await bot.destroy()

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
                        await teamspeakHelper.delete(server)

                        await server.destroy()

                        resolve()
                    })
                })
            )
        }

        await user.destroy()
        clearLog("user", userId)

        userLogger.info(`کاربر ${user.username} و تمام منابع مربوطه توسط ${req.user.username} حذف شد`)
        return res.status(apiCodes.SUCCESS).json(responses.USER.DELETED)
    } catch (err) {
        console.error("Error full suspending user: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
