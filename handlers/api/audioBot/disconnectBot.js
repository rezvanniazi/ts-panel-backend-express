const AudioBots = require("../../../models/AudioBots")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")

const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { id, scope, username } = req.user
        const { botId } = req.body

        const bot = await AudioBots.findByPk(botId)
        const botLogger = createLogger("audiobot", botId)

        if (!bot) {
            botLogger.error(`بات با ایدی ${botId} توسط ${username} پیدا نشد`)
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.NOT_FOUND)
        }

        if (scope == "reseller" && bot.bot_owner !== username) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const panel = await MusicBotPanels.findByPk(bot.panel_id)
        if (!panel) {
            botLogger.error(`پنل ${bot.panel_id} برای بات ${bot.template_name} پیدا نشد`)
            return res.status(apiCodes.PANEL_OFFLINE).json(responses.PANEL.IS_OFFLINE)
        }

        await audioBotHelper.disconnect({ templateName: bot.template_name, panel })

        bot.status = "offline"
        await bot.save()

        botLogger.info(`بات ${bot.template_name} توسط ${username} قطع شد`)
        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.DISCONNECTED)
    } catch (err) {
        console.error(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
