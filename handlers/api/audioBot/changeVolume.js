const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const AudioBots = require("../../../models/AudioBots")

const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const MusicBotPanels = require("../../../models/MusicBotPanels")

module.exports = async (req, res) => {
    try {
        const { botId, volume } = req.body
        const { username, scope } = req.user

        const bot = await AudioBots.findByPk(botId)

        if (!bot) {
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.NOT_FOUND)
        }

        if (scope == "reseller" && bot.bot_owner !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        const panel = await MusicBotPanels.findByPk(bot.panel_id)
        if (!panel || panel.status == "offline") {
            return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.IS_OFFLINE)
        }

        await audioBotHelper.changeVolume({ templateName: bot.template_name, panel, volume })

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
