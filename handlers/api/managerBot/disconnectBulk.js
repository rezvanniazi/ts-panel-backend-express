const TsManagerBots = require("../../../models/TsManagerBots")
const ManagerBotPanels = require("../../../models/ManagerBotPanels")
const { ManagerBotPanel } = require("../../../lib/managerBot/ManagerBotPanel")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { username, scope, id } = req.user
        const { selecteds } = req.body
        const userLogger = createLogger("user", id)

        const panelList = await ManagerBotPanels.findAll()

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
                    let panel = ManagerBotPanel.getPanel(b.panel_id)

                    if (panel && panel?.socket?.connected) {
                        await panel.disconnectBot({ templateName: b.template_name }).catch(() => {})
                        b.status = "offline"
                        await b.save()
                    }
                    resolve()
                })
            })
        )

        userLogger.info(`قطع اتصال گروهی بات‌های منیجر توسط ${username} - تعداد: ${botList.length}`)
        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.DISCONNECTED)
    } catch (err) {
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
