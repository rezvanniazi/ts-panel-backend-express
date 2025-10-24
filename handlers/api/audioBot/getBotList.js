const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const AudioBots = require("../../../models/AudioBots")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { scope, username, id } = req.user
        const userLogger = createLogger("user", id)

        let botList
        const panelList = await MusicBotPanels.findAll()

        if (scope === "admin") {
            botList = await AudioBots.findAll({ raw: true })
        } else {
            botList = await AudioBots.findAll({ where: { bot_owner: username }, raw: true })
        }

        botList = botList.map((b) => {
            const p = panelList.find((p) => p.id == b.panel_id)

            b.panel_name = p?.name || "Unknown"
            b.panel_status = p?.status || "offline"

            return b
        })

        userLogger.info(`لیست بات‌ها توسط ${username} درخواست شد - تعداد: ${botList.length}`)
        return res.status(apiCodes.SUCCESS).json(botList)
    } catch (err) {
        console.error("Get bot list Error: ", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
