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

        if (!bot || (scope == "reseller" && bot.bot_owner !== username)) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        if (panel && panel.status === "online") {
            await audioBotHelper.disconnect({ templateName: bot.template_name, panel })
        }
        bot.status = "offline"

        bot.state = "suspended"
        await bot.save()

        botLogger.info(`بات ${bot.template_name} توسط ${username} معلق شد`)
        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.SUSPENDED)
    } catch (err) {
        console.error("Error suspending bot: ", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
