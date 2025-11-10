const AudioBots = require("../../../models/AudioBots")
const MusicBotPanels = require("../../../models/MusicBotPanels")

const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const { botId } = req.body

        const bot = await AudioBots.findByPk(botId)
        const panel = await MusicBotPanels.findByPk(bot.panel_id)
        const botLogger = createLogger("audiobot", botId)

        /////////////////// Validation //////////////////
        if (!bot) {
            botLogger.error(`بات با ایدی ${botId} توسط ${username} پیدا نشد`)
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.NOT_FOUND)
        }
        if (!panel || panel.status === "offline") {
            botLogger.error(`پنل ${bot.panel_id} برای بات ${bot.template_name} آفلاین یا پیدا نشد`)
            return res.status(apiCodes.PANEL_OFFLINE).json(responses.PANEL.IS_OFFLINE)
        }

        if (scope == "reseller" && bot.bot_owner !== username) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${bot.template_name}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        ///////////////////////////////////////////////////
        await audioBotHelper.disconnect({ templateName: bot.template_name, panel })

        const isConnected = await audioBotHelper.connect({
            templateName: bot.template_name,
            panel,
            playing: bot.playing,
        })

        if (isConnected) {
            bot.status = "connecting"
            await bot.save()
        }

        botLogger.info(`بات ${bot.template_name} توسط ${username} مجدداً متصل شد`)
        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.RECONNECTED)
    } catch (err) {
        console.error(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
