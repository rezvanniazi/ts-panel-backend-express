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

        if (!bot) {
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.NOT_FOUND)
        }

        if (bot.bot_owner !== username && scope !== "admin") {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        if (bot.isExpired()) {
            return res.status(apiCodes.FORBIDDEN).json(responses.AUDIO_BOT.EXPIRED)
        }

        if (panel && panel.status === "online") {
            await audioBotHelper.connect({ templateName: bot.template_name, panel, playing: bot.playing })
            bot.status = "connecting"
        }
        const logger = createLogger("audiobot", botId)
        logger.info(`بات ${bot.template_name} توسط ${username} فعال شد`)

        bot.state = "active"
        await bot.save()

        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.ACTIVATED)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
