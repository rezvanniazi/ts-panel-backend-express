const TsManagerBots = require("../../../models/TsManagerBots")
const { ManagerBotPanel } = require("../../../lib/managerBot/ManagerBotPanel")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const createTemplate = require("../../../lib/managerBot/createTemplate")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { botId } = req.body
        const { username, scope } = req.user

        const bot = await TsManagerBots.findByPk(botId)
        const botLogger = createLogger("managerBot", botId)

        if (!bot) {
            botLogger.error(`بات با ایدی ${botId} توسط ${username} پیدا نشد`)
            return res.status(apiCodes.NOT_FOUND).json(responses.MANAGER_BOT.NOT_FOUND)
        }

        if (scope == "reseller" && bot.author !== username) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        // Check if bot is expired
        if (bot.expires < new Date()) {
            botLogger.error(`فعال کردن بات ${botId} با شکست مواجه شد (تمدید بات اتمام شده است)`)
            return res.status(apiCodes.EXPIRED).json(responses.MANAGER_BOT.BOT_EXPIRED)
        }
        // Change bot state in db
        bot.state = "active"

        // Call create api since we delete after suspend
        // Fetch bots panel
        const panel = ManagerBotPanel.getPanel(bot.panel_id)

        if (panel && panel?.socket?.connected) {
            await panel.createBot(createTemplate(bot.template_name, bot.channels, bot.conn)).catch(() => {}) // Ignore if fails
        }

        // Save changes in db
        await bot.save()

        botLogger.info(`بات توسط ${username} فعال شد`)
        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.ACTIVATED)
    } catch (err) {
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
