const Permissions = require("../../../models/Permissions")
const TsManagerBots = require("../../../models/TsManagerBots")
const ManagerBotPanels = require("../../../models/ManagerBotPanels")
const Users = require("../../../models/Users")

const managerBotApis = require("../../../lib/managerBot/ManagerBotPanel")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { sequelize } = require("../../../config/database")
const createTemplate = require("../../../lib/managerBot/createTemplate")
const { createLogger } = require("../../../utils/logger")

const calculatePrice = (permissions, selectedPerms) => {
    let amount = permissions.find((p) => p.name == "createBot").price
    for (let permName of Object.keys(selectedPerms)) {
        const { checked, multi } = selectedPerms[permName]
        if (checked) {
            const permission = permissions.find((p) => p.name == permName)
            if (multi) {
                for (let i = 0; i < multi; i++) {
                    amount += permission.price
                }
            } else {
                amount += permission.price
            }
        }
    }
    return amount
}

module.exports = async (req, res) => {
    const transaction = await sequelize.transaction()
    try {
        const { id } = req.user
        let { templateName, channels, selectedPerms, conn, panelId, autorenew } = req.body

        const user = await Users.findByPk(id)
        const userLogger = createLogger("user", user.id)

        const permissions = await Permissions.findAll()
        const templateNameInUse = await TsManagerBots.findOne({ where: { template_name: templateName } })
        const price = calculatePrice(permissions, selectedPerms)

        if (templateNameInUse) {
            userLogger.error(`نام قالب ${templateName} توسط ${user.username} قبلاً استفاده شده`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.TEMPLATE_NAME_IN_USE)
        }

        let panel
        if (user.scope == "admin" && panelId) {
            panel = await ManagerBotPanels.findByPk(panelId)
        } else {
            // Fetch panels from db and get the first panel that in use count is less then max_bot and is online
            panel = (await ManagerBotPanels.findAll()).find(
                (p) => p.in_use_count < p.max_bot && p.status == "online"
            )[0]
        }
        if (!panel) {
            userLogger.error(`هیچ پنل در دسترسی برای ${user.username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.NO_AVAILABLE_PANEL)
        }
        try {
            await user.subtractBalance(price, transaction)
        } catch (err) {
            if (err?.message == "Insufficient balance") {
                userLogger.error(`موجودی ناکافی برای ${user.username} - مبلغ مورد نیاز: ${price}`)
                await transaction.rollback()
                return res.status(apiCodes.FORBIDDEN).json(responses.USER.INSUFFICIENT_BALANCE)
            } else {
                throw new Error(err)
            }
        }
        ////////////////////////// End Validation //////////////////////

        // Calculate expiration time after 30 days
        let expires = new Date()
        expires.setDate(expires.getDate() + 30)
        ////////////////////////////////////

        // Delete selectedPerms if checked is false
        for (let [key, value] of Object.entries(selectedPerms)) {
            if (!value.checked) {
                delete selectedPerms[key]
            }
        }
        ///////////////////////////////////////////

        // Delete channels if their permissions is not selected
        for (let ch of Object.keys(channels)) {
            const perms = Object.keys(selectedPerms)
            if (!perms.includes(ch)) {
                delete channels[ch]
            }
        }
        ///////////////////////////////////////////////////////
        // Insert to database
        let data = {
            conn,
            channels,
            permissions: selectedPerms,
            expires,
            author: user.username,
            template_name: templateName,
            panel_id: panel.id,
            autorenew: autorenew,
        }
        const bot = await TsManagerBots.create(data, { transaction })
        ////////////////////////////////////////////////////

        // Call api and create bot in Manager Bots panel
        const template = createTemplate(templateName, channels, conn)
        try {
            await managerBotApis.create({ panel, data: template })
            bot.status = "online"
            await bot.save({ transaction })
        } catch (err) {
            const errorCode = err?.errorCode

            if (errorCode == "ALREADY_ADDED") {
                await transaction.rollback()
                return res.status(apiCodes.BAD_REQUEST).json(responses.MANAGER_BOT.TEMPLATE_NAME_IN_USE)
            } else if (errorCode == "ECONNREFUSED") {
                bot.status = "offline"
            } else {
                throw err
            }
        }
        //////////////////////////////////////////////////
        await bot.save({ transaction })
        await transaction.commit()

        const botLogger = createLogger("managerBot", bot.id)
        botLogger.info(`بات منیجر ${templateName} با موفقیت توسط ${user.username} ساخته شد`)
        userLogger.info(`مقدار ${price} از حساب ${user.username} کسر شد`)

        return res.status(apiCodes.SUCCESS).json(responses.MANAGER_BOT.CREATED)
    } catch (err) {
        await transaction.rollback()

        console.error(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
