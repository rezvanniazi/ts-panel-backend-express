const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const TsManagerBots = require("../../../models/TsManagerBots")
const { createLogger } = require("../../../utils/logger")

const toggleAutoRenew = async (req, res) => {
    try {
        const { botId, autorenew } = req.body
        const { username, scope } = req.user

        const bot = await TsManagerBots.findByPk(botId)
        const botLogger = createLogger("managerBot", botId)

        if (!bot) {
            botLogger.error(`بات با ایدی ${botId} توسط ${username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.NOT_FOUND)
        }
        if (scope == "reseller" && username !== bot.author) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        bot.autorenew = autorenew
        await bot.save()

        botLogger.info(`تنظیمات تمدید خودکار بات توسط ${username} به روز شد: ${autorenew}`)
        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.TOGGLE_AUTORENEW.SUCCESS)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

module.exports = toggleAutoRenew
