const AudioBots = require("../../../models/AudioBots")
const { sequelize } = require("../../../config/database")
const BotPackages = require("../../../models/BotPackages")
const Users = require("../../../models/Users")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { botId } = req.body

        const bot = await AudioBots.findByPk(botId)
        const user = await Users.findByPk(req.user.id)
        const userLogger = createLogger("user", user.id)
        const botLogger = createLogger("audiobot", botId)

        if (!bot) {
            userLogger.error(`بات با ایدی ${botId} توسط ${user.username} پیدا نشد`)
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.PACKAGE_NOT_FOUND)
        }

        if (user.scope == "reseller" && user.username !== bot.bot_owner) {
            userLogger.error(`دسترسی غیرمجاز برای ${user.username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const package = await BotPackages.findOne({ where: { package_name: bot.package_name } })

        if (!package) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.AUDIO_BOT.PACKAGE_NOT_FOUND)
        }

        if (!package.package_days || package.package_days <= 0) {
            return res.status(apiCodes.UNLIMIT_PACKAGE_EXTEND).json(responses.AUDIO_BOT.EXTEND_UNLIMITED)
        }

        if (bot.expires) {
            const today = new Date()
            let expires = new Date(bot.expires)
            if (expires < today) {
                expires = today
            }
            expires.setDate(expires.getDate() + package.package_days)

            bot.expires = expires
            await bot.save({ transaction })
            try {
                await user.subtractBalance(package.package_amount, transaction)
            } catch (err) {
                if (err.message == "Insufficient Balance") {
                    userLogger.error(`موجودی ناکافی برای ${user.username} - مبلغ مورد نیاز: ${package.package_amount}`)
                    return res.status(apiCodes.INSUFFICIENT_BALANCE).json(responses.USER.INSUFFICIENT_BALANCE)
                } else {
                    throw err
                }
            }
        }
        await transaction.commit()

        botLogger.info(`بات توسط ${user.username} تمدید شد - ${package.package_days} روز`)
        userLogger.info(`مقدار ${package.package_amount} از حساب ${user.username} کسر شد`)

        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.EXTENDED)
    } catch (err) {
        await transaction.rollback()
        console.error("Extend bot error: ", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
