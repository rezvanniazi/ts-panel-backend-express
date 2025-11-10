const TsManagerBots = require("../../../models/TsManagerBots")
const Permissions = require("../../../models/Permissions")

const ManagerBotPanels = require("../../../models/ManagerBotPanels")
const Users = require("../../../models/Users")
const { ManagerBotPanel } = require("../../../lib/managerBot/ManagerBotPanel")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger, clearLog } = require("../../../utils/logger")

const calculateRemainedPrice = (expires, permissions, botPermissions) => {
    let remainedPrice = 0

    const getRemainedDays = (expires) => {
        const today = new Date()
        const diff = expires - today

        if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            return days
        } else {
            return 0
        }
    }

    const remainedDays = getRemainedDays(expires)
    if (remainedDays == 0) {
        return 0
    }

    for (let p of permissions) {
        if (p.name == "createBot") continue
        const botPerm = botPermissions[p.name]

        if (botPerm && p.multi) {
            remainedPrice += (p.price / 30) * remainedDays * (parseInt(botPerm.multi) || 1)
        } else if (botPerm) {
            remainedPrice += (p.price / 30) * remainedDays
        }
    }

    return Math.ceil(remainedPrice)
}

module.exports = async (req, res) => {
    try {
        const { id: userId } = req.user
        const { botId } = req.body

        const user = await Users.findByPk(userId)
        const userLogger = createLogger("user", user.id)
        const bot = await TsManagerBots.findByPk(botId)
        if (!bot || (user.scop == "resller" && bot.author !== user.username)) {
            userLogger.error(`بات با ایدی ${botId} توسط ${user.username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.NOT_FOUND)
        }

        const panel = ManagerBotPanel.getPanel(bot.panel_id)
        // Don't let to delete bot if Manager panel is not connected unless it is admin
        if ((!panel && user.scope == "reseller") || (!panel?.socket?.connected && user.scope === "reseller")) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.IS_OFFLINE)
        }
        /////////////// End Validation /////////////////////
        // Calculate remained price
        const permissions = await Permissions.findAll()
        const remainedPrice = calculateRemainedPrice(bot.expires, permissions, bot.permissions)

        if (panel && panel?.socket?.connected) {
            try {
                await panel.deleteBot({ templateName: bot.template_name })
            } catch (err) {
                console.error(err)
            }
        }

        await bot.destroy()
        await user.addBalance(remainedPrice)

        if (remainedPrice > 0) {
            userLogger.info(
                `مقدار ${remainedPrice} به حساب ${user.username} بابت حذف بات منیجر ${bot.template_name} اضافه شد`
            )
        }
        userLogger.info(`بات منیجر ${bot.template_name} توسط ${user.username} حذف شد`)
        clearLog("managerBot", botId)

        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.DELETED)
    } catch (err) {
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
