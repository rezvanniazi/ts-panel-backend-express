const TsManagerBots = require("../../../models/TsManagerBots")
const ManagerBotPanels = require("../../../models/ManagerBotPanels")
const { ManagerBotPanel } = require("../../../lib/managerBot/ManagerBotPanel")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const { botId } = req.body

        const bot = await TsManagerBots.findByPk(botId)
        const botLogger = createLogger("managerBot", botId)

        if (!bot || bot.state == "suspended") {
            botLogger.error(`بات با ایدی ${botId} توسط ${username} پیدا نشد یا معلق است`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.NOT_FOUND)
        }
        if (scope == "reseller" && bot.author !== username) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        // Fetch bots panel
        const panel = ManagerBotPanel.getPanel(bot.panel_id)
        if (!panel || !panel?.socket?.connected) {
            botLogger.error(`پنل ${bot.panel_id} برای بات ${botId} آفلاین یا پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.IS_OFFLINE)
        }
        ////////////////// End validation ////////////////

        try {
            await panel.disconnectBot({ templateName: bot.template_name })
            await bot.update({ status: "offline" })
        } catch (err) {
            // Create if doesn't exists
            const errorCode = err?.error || ""
            console.log(errorCode)
            if (errorCode == "NOT_FOUND") {
                return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.NOT_CONNECTED)
            } else {
                throw err
            }
        }

        botLogger.info(`بات ${bot.template_name} توسط ${username} قطع شد`)
        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.DISCONNECTED)
    } catch (err) {
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
