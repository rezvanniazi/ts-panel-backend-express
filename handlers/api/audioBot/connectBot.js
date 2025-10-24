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
        const botLogger = createLogger("audiobot", botId)

        /////////////////// Validation //////////////////
        if (!bot) {
            botLogger.error(`بات با ایدی ${botId} توسط ${username} پیدا نشد`)
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.NOT_FOUND)
        }
        const panel = await MusicBotPanels.findByPk(bot.panel_id)
        if (!panel || panel.status === "offline") {
            botLogger.error(`پنل ${bot.panel_id} برای بات ${botId} آفلاین یا پیدا نشد`)
            return res.status(apiCodes.PANEL_OFFLINE).json(responses.PANEL.IS_OFFLINE)
        }

        if (scope == "reseller" && bot.bot_owner !== username) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        ///////////////////////////////////////////////////

        const status = await audioBotHelper.connect({
            templateName: bot.template_name,
            panel,
            playing: bot.playing,
        })
        bot.status = status || "offline"
        await bot.save()

        botLogger.info(`بات توسط ${username} متصل شد`)
        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.CONNECT.SUCCESS)
    } catch (err) {
        console.error(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
