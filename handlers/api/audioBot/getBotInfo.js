const AudioBots = require("../../../models/AudioBots")
const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { scope, username } = req.user
        const { botId } = req.params

        const bot = await AudioBots.findByPk(botId, { raw: true })
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
        if (panel && panel.status == "online") {
            bot.volume = await audioBotHelper.getVolume({ templateName: bot.template_name, panel })
        } else {
            bot.volume = 0
        }

        botLogger.info(`اطلاعات بات توسط ${username} درخواست شد`)
        return res.status(apiCodes.SUCCESS).json(bot)
    } catch (err) {
        console.error("get bot info Error: ", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
