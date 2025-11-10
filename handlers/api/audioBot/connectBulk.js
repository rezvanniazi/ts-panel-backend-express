const AudioBots = require("../../../models/AudioBots")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { scope, username, id } = req.user
        const { selecteds } = req.body
        const userLogger = createLogger("user", id)
        let botList
        let panelList = await MusicBotPanels.findAll()

        if (scope == "admin") {
            botList = await AudioBots.findAll()
        } else {
            botList = await AudioBots.findAll({ where: { bot_owner: username } })
        }

        if (selecteds) {
            botList = botList.filter((b) => {
                return selecteds.includes(b.id)
            })
        }
        await Promise.all(
            botList.map((b) => {
                return new Promise(async (resolve, reject) => {
                    if (b.state == "suspended") return resolve()

                    let panel = panelList.find((p) => p.id == b.panel_id)
                    if (panel && panel.status == "online" && b.state !== "suspended") {
                        await audioBotHelper.connect({ templateName: b.template_name, panel })
                        const botLogger = createLogger("audiobot", b.id)
                        botLogger.info(`بات ${b.template_name} توسط ${username} متصل شد`)
                        b.status = "connecting"
                        await b.save()
                    }

                    resolve()
                })
            })
        )

        userLogger.info(`اتصال گروهی بات‌ها توسط ${username} - تعداد: ${botList.length}`)
        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.CONNECT.SUCCESS)
    } catch (err) {
        console.error("Connect Bulk Error: ", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
