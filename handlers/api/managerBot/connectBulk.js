const TsManagerBots = require("../../../models/TsManagerBots")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { ManagerBotPanel } = require("../../../lib/managerBot/ManagerBotPanel")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { username, scope, id } = req.user
        const { selecteds } = req.body
        const userLogger = createLogger("user", id)

        let botList
        if (scope == "admin") {
            botList = await TsManagerBots.findAll()
        } else {
            botList = await TsManagerBots.findAll({ where: { author: username } })
        }

        if (selecteds) {
            botList = botList.filter((b) => {
                return selecteds.includes(b.id)
            })
        }

        await Promise.all(
            botList.map((b) => {
                return new Promise(async (resolve) => {
                    if (b.state == "suspended") return resolve()

                    let panel = ManagerBotPanel.getPanel(b.panel_id)

                    if (panel && panel?.socket?.connected) {
                        try {
                            console.log("HH")
                            await panel.connectBot({ templateName: b.template_name })
                            const botLogger = createLogger("managerBot", b.id)
                            botLogger.info(`بات ${b.template_name} توسط ${username} متصل شد`)

                            b.status = "online"
                        } catch {
                            b.status = "offline"
                        } finally {
                            await b.save()
                        }
                    }
                    resolve()
                })
            })
        )

        userLogger.info(`اتصال گروهی بات‌های منیجر توسط ${username} - تعداد: ${botList.length}`)
        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.CONNECT.SUCCESS)
    } catch (err) {
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
