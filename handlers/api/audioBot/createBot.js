const AudioBots = require("../../../models/AudioBots")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const BotPackages = require("../../../models/BotPackages")

const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { sequelize } = require("../../../config/database")
const Users = require("../../../models/Users")
const { createLogger } = require("../../../utils/logger")

function getRandomInt() {
    min = Math.ceil(1000)
    max = Math.floor(999999)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = async (req, res) => {
    const transaction = await sequelize.transaction()

    let expireDate

    try {
        const { id } = req.user
        const {
            botName,
            botServerIp,
            botDefaultChannelName,
            botChannelCommanderIsOn,
            botPackageName,
            panelId,
            information,
            autorenew,
        } = req.body

        const user = await Users.findByPk(id)
        const userLogger = createLogger("user", user.id)

        const package = await BotPackages.findOne({ where: { package_name: botPackageName } })
        if (!package) {
            userLogger.error(`پکیج ${botPackageName} توسط ${user.username} پیدا نشد`)
            return res.status(apiCodes.NOT_FOUND).json(responses.AUDIO_BOT.PACKAGE_NOT_FOUND)
        }
        if (package.package_days) {
            const today = new Date()
            today.setDate(today.getDate() + package.package_days + 1)
            expireDate = today
        }

        let panel
        if (panelId && user.scope == "admin") {
            panel = await MusicBotPanels.findByPk(panelId)
            if (!panel || panel.status === "offline") {
                userLogger.error(`پنل ${panelId} توسط ${user.username} آفلاین یا پیدا نشد`)
                return res.status(apiCodes.PANEL_OFFLINE).json(responses.PANEL.IS_OFFLINE)
            }
        } else {
            let panels = (
                await MusicBotPanels.findAll({ where: { panel_type: package.package_bot_type, status: "online" } })
            ).filter((p) => p.in_use_count < p.max_bot)

            panel = panels[0]
            if (!panel) {
                userLogger.error(`هیچ پنل در دسترسی برای ${user.username} پیدا نشد`)
                return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.NO_AVAILABLE_PANEL)
            }
        }
        let templateName = `${user.username}-${getRandomInt()}`

        try {
            await user.subtractBalance(package.package_amount, transaction)
            var bot = await AudioBots.create({
                name: botName,
                bot_server_ip: botServerIp,
                bot_default_channel_name: botDefaultChannelName,
                bot_owner: user.username,
                information,
                expires: expireDate,
                package_name: package.package_name,
                type: package.package_bot_type,
                status: "connecting",
                panel_id: panel.id,
                template_name: templateName,
                bot_channel_commander_is_on: botChannelCommanderIsOn,
                autorenew,
            })
        } catch (err) {
            if (err.message == "Insufficient balance") {
                userLogger.error(`موجودی ناکافی برای ${user.username} - مبلغ مورد نیاز: ${package.package_amount}`)
                transaction.rollback()
                return res.status(apiCodes.INSUFFICIENT_BALANCE).json(responses.USER.INSUFFICIENT_BALANCE)
            } else {
                throw new Error(err)
            }
        }
        const botLogger = createLogger("audiobot", bot.id)

        // Call Api to TS3AudioBot
        await audioBotHelper
            .create({
                type: package.package_bot_type,
                templateName,
                address: botServerIp,
                botName,
                defaultChannel: botDefaultChannelName,
                panel,
            })
            .catch((err) => {
                console.log(err)
                throw new Error()
            })

        await transaction.commit()

        botLogger.info(`بات ${botName} با موفقیت توسط ${user.username} ساخته شد - پکیج: ${package.package_name}`)
        userLogger.info(`مقدار ${package.package_amount} از حساب ${user.username} کسر شد`)

        return res.status(apiCodes.SUCCESS).json({ ...responses.AUDIO_BOT.CREATED, ...bot })
    } catch (err) {
        transaction.rollback()
        console.error(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
