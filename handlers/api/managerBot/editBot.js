const Permissions = require("../../../models/Permissions")
const TsManagerBots = require("../../../models/TsManagerBots")
const Users = require("../../../models/Users")

const { ManagerBotPanel } = require("../../../lib/managerBot/ManagerBotPanel")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const createTemplate = require("../../../lib/managerBot/createTemplate")
const { createLogger } = require("../../../utils/logger")

const getRemainedDays = (expires) => {
    const today = new Date()
    const diff = expires - today

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    return days
}

const filterPermissions = (bot, selectedPerms, oldPerms, permissions) => {
    let remainedDays = getRemainedDays(bot.expires)
    if (remainedDays < 0) remainedDays = 0

    let price = 0
    for (let p of permissions) {
        if (p.name == "createBot") continue
        if (!oldPerms[p.name]?.checked && selectedPerms[p.name]?.checked) {
            if (p.multi) {
                price += ((p.price * selectedPerms[p.name].multi) / 30) * remainedDays
            } else {
                price += (p.price / 30) * remainedDays
            }
        } else if (p.multi && oldPerms[p.name] && selectedPerms[p.name]) {
            if (oldPerms[p.name].multi < selectedPerms[p.name].multi) {
                price += ((p.price * (selectedPerms[p.name].multi - oldPerms[p.name].multi)) / 30) * remainedDays
            }
        }
    }
    return { price: Math.ceil(price) }
}

module.exports = async (req, res) => {
    try {
        const { id, username, scope } = req.user
        let { botId, channels, selectedPerms, conn, panelId, autorenew } = req.body

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

        let panel = ManagerBotPanel.getPanel(bot.panel_id)
        let newPanel

        if (panelId && panelId !== bot.panel_id && scope == "admin") {
            newPanel = ManagerBotPanel.getPanel(panelId)
        } else {
            newPanel = panel
            panelId = bot.panel_id
        }

        if (!newPanel || !newPanel?.socket?.connected) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.IS_OFFLINE)
        }

        const user = await Users.findByPk(id)

        let oldPerms
        try {
            oldPerms = typeof bot.permissions === "object" ? bot.permissions : JSON.parse(bot.permissions)
        } catch (e) {
            oldPerms = {}
        }

        const permissions = await Permissions.findAll()
        const { price } = filterPermissions(bot, selectedPerms, oldPerms, permissions)

        try {
            if (price > 0) await user.subtractBalance(price)
        } catch (err) {
            if (err?.message == "Insufficient balance") {
                const userLogger = createLogger("user", user.id)
                userLogger.error(`موجودی ناکافی برای ${user.username} - مبلغ مورد نیاز: ${price}`)
                return res.status(apiCodes.FORBIDDEN).json(responses.USER.INSUFFICIENT_BALANCE)
            } else {
                throw new Error(err)
            }
        }

        // delete channels if their permission didn't selected
        for (let ch of Object.keys(channels)) {
            const keys = Object.keys(selectedPerms)
            if (!keys.includes(ch)) {
                delete channels[ch]
            }
        }

        bot.permissions = selectedPerms
        bot.channels = channels
        bot.conn = conn
        bot.panel_id = panelId
        bot.autorenew = autorenew == null ? bot.autorenew : autorenew

        const template = createTemplate(bot.template_name, { ...channels }, { ...conn })

        if (panel && panel?.socket?.connected) {
            try {
                await panel.deleteBot({ templateName: bot.template_name })
            } catch (e) {
                // ignore
            }
        }

        if (bot.state == "active") {
            try {
                await newPanel.createBot(template)
                await newPanel.connectBot({ templateName: bot.template_name })

                bot.status = "online"
            } catch (err) {
                console.log(err)
                bot.status = "offline"
            }
        } else {
            bot.status = "offline"
        }

        await bot.save()

        botLogger.info(`بات ${bot.template_name} توسط ${username} ویرایش شد`)
        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.EDITED)
    } catch (err) {
        console.error(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
