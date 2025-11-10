const MusicBotPanels = require("../../../models/MusicBotPanels")
const AudioBots = require("../../../models/AudioBots")
const BotPackages = require("../../../models/BotPackages")

const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Users = require("../../../models/Users")
const { createLogger, clearLog } = require("../../../utils/logger")

function calculateRemainedAmount(bot, package) {
    const today = new Date()
    const botExpires = new Date(bot.expires)
    const daysRemaining = Math.max(0, Math.floor((botExpires - today) / (1000 * 60 * 60 * 24)) - 1)

    return Math.floor((package.package_amount / package.package_days) * daysRemaining)
}

module.exports = async (req, res) => {
    try {
        const { id: userId } = req.user
        const { botId } = req.body

        const user = await Users.findByPk(userId)
        const userLogger = createLogger("user", user.id)
        const bot = await AudioBots.findByPk(botId)
        if (!bot) {
            userLogger.error(`بات با ایدی ${botId} توسط ${user.username} پیدا نشد`)
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.NOT_FOUND)
        }
        if (user.scope == "reseller" && bot.bot_owner !== user.username) {
            userLogger.error(`دسترسی غیرمجاز برای ${user.username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const package = await BotPackages.findOne({ where: { package_name: bot.package_name } })
        const panel = await MusicBotPanels.findByPk(bot.panel_id)
        if (!package && user.scope == "reseller") {
            return res.status(apiCodes.BAD_REQUEST).json(responses.AUDIO_BOT.PACKAGE_NOT_FOUND)
        }

        if ((!panel || panel.status === "offline") && user.scope == "reseller") {
            return res.status(apiCodes.PANEL_OFFLINE).json(responses.PANEL.IS_OFFLINE)
        }

        if (bot.expires && package && package.package_days && package.package_days > 0) {
            const remainedAmount = calculateRemainedAmount(bot, package)
            await user.addBalance(remainedAmount)
            userLogger.info(
                `مقدار ${remainedAmount} به حساب ${user.username} بابت حذف بات ${bot.template_name} اضافه شد`
            )
        }

        await bot.destroy()
        if (panel) {
            await audioBotHelper.delete({ templateName: bot.template_name, panel })
        }

        clearLog("audiobot", botId)
        userLogger.info(`بات ${bot.template_name} توسط ${user.username} حذف شد`)

        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.DELETED)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
