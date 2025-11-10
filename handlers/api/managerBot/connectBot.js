const TsManagerBots = require("../../../models/TsManagerBots")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const createTemplate = require("../../../lib/managerBot/createTemplate")
const { ManagerBotPanel } = require("../../../lib/managerBot/ManagerBotPanel")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { botId } = req.body
        const { username, scope } = req.user

        const bot = await TsManagerBots.findByPk(botId)
        const botLogger = createLogger("managerBot", botId)

        if (!bot || bot.state == "suspended") {
            botLogger.error(`بات با ایدی ${botId} توسط ${username} پیدا نشد یا معلق است`)
            return res.status(apiCodes.NOT_FOUND).json(responses.MANAGER_BOT.NOT_FOUND)
        }
        if (scope == "reseller" && bot.author !== username) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${bot.template_name}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        // Fetch bots panel
        const panel = ManagerBotPanel.getPanel(bot.panel_id)

        if (!panel || !panel?.socket?.connected) {
            botLogger.error(`پنل ${bot.panel_id} برای بات ${bot.template_name} آفلاین یا پیدا نشد`)
            return res.status(apiCodes.PANEL_OFFLINE).json(responses.PANEL.IS_OFFLINE)
        }

        try {
            await panel.connectBot({ templateName: bot.template_name })

            bot.status = "online"
        } catch (err) {
            const errorCode = err.error
            console.log(errorCode)
            if (errorCode == "NOT_FOUND") {
                await panel.createBot(createTemplate(bot.template_name, bot.channels, bot.conn))
            } else if (errorCode == "CONNECT_FAILED") {
                botLogger.error(
                    `بات ${bot.template_name} به دلیل ${errorCode} به سرور متصل نشده درخواست شده توسط ${username}`
                )
                bot.status = "offline"
                return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.CONNECT.CONN_REFUSED)
            } else if (errorCode == "ALREADY_CONNECTED") {
                botLogger.error(
                    `درخواست کانکت بات ${bot.template_name} با شکست مواجه شد به دلیل متصل میباشد درخواست شده توسط ${username}`
                )
                bot.status = "online"
                return res.status(apiCodes.ALREADY_RUNNING).json(responses.MANAGER_BOT.CONNECT.ALREADY_CONNECTED)
            } else {
                throw err
            }
        } finally {
            await bot.save()
        }

        botLogger.info(`بات ${bot.template_name} توسط ${username} متصل شد`)
        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.CONNECT.SUCCESS)
    } catch (err) {
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
