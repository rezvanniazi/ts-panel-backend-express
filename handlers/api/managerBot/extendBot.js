const TsManagerBots = require("../../../models/TsManagerBots")
const Users = require("../../../models/Users")
const Permissions = require("../../../models/Permissions")

const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { sequelize } = require("../../../config/database")
const { createLogger } = require("../../../utils/logger")

const calculatePermissions = (permissions, botPerms) => {
    let amount = permissions.find((p) => p.name == "createBot").price
    for (let permName of Object.keys(botPerms)) {
        const { checked, multi } = botPerms[permName]
        if (checked) {
            const permission = permissions.find((p) => p.name == permName)
            if (multi) {
                for (let i = 0; i < multi; i++) {
                    amount += permission.price
                }
            }
        }
    }
    return amount
}

module.exports = async (req, res) => {
    const transaction = await sequelize.transaction()
    try {
        const { botId } = req.body
        const { id: userId } = req.user

        const user = await Users.findByPk(userId)
        const userLogger = createLogger("user", user.id)
        const bot = await TsManagerBots.findByPk(botId)
        const botLogger = createLogger("managerBot", botId)
        const permissions = await Permissions.findAll()

        if (!bot) {
            userLogger.error(`بات با ایدی ${botId} توسط ${user.username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.NOT_FOUND)
        }

        if (user.scope == "reseller" && bot.author !== user.username) {
            userLogger.error(`دسترسی غیرمجاز برای ${user.username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        if (!bot.expires) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.EXTEND_UNLIMITED)
        }

        const botPerms = bot.permissions

        const price = calculatePermissions(permissions, botPerms)

        try {
            await user.subtractBalance(price)
        } catch (err) {
            if (err.message == "Insufficient balance") {
                userLogger.error(`موجودی ناکافی برای ${user.username} - مبلغ مورد نیاز: ${price}`)
                await transaction.rollback()
                return res.status(apiCodes.INSUFFICIENT_BALANCE).json(responses.USER.INSUFFICIENT_BALANCE)
            } else {
                throw err
            }
        }

        let today = new Date()
        let expires = bot.expires
        if (expires < today) {
            expires = today
        }
        expires.setDate(expires.getDate() + 30)

        await bot.update({ expires })
        await transaction.commit()

        botLogger.info(`بات ${bot.template_name} توسط ${user.username} تمدید شد - 30 روز`)
        userLogger.info(`مقدار ${price} از حساب ${user.username} بابت تمدید بات منیجر ${bot.template_name} کسر شد`)

        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.EXTENDED)
    } catch (err) {
        await transaction.rollback()
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
