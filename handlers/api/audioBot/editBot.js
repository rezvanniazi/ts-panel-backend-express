const AudioBots = require("../../../models/AudioBots")
const MusicBotPanels = require("../../../models/MusicBotPanels")
const BotPackages = require("../../../models/BotPackages")

const audioBotHelper = require("../../../lib/audioBot/audioBotHelper")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { sequelize } = require("../../../config/database")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const {
            botId,
            botName,
            botServerIp,
            botDefaultChannelName,
            botChannelCommanderIsOn,
            information,
            panelId,
            autorenew,
        } = req.body

        const bot = await AudioBots.findByPk(botId)
        const botLogger = createLogger("audiobot", botId)

        if (!bot || (scope == "reseller" && bot.bot_owner !== username)) {
            botLogger.error(`دسترسی غیرمجاز برای ${username} به بات ${botId}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        let currentPanel = await MusicBotPanels.findByPk(bot.panel_id)

        if (panelId && panelId !== currentPanel.id) {
            let newPanel = await MusicBotPanels.findByPk(panelId)
            if (!newPanel || newPanel.status == "offline") {
                return res.status(apiCodes.PANEL_OFFLINE).json(responses.PANEL.IS_OFFLINE)
            }

            await audioBotHelper.delete({ templateName: bot.template_name, panel: currentPanel })

            await audioBotHelper.create({
                type: bot.type,
                templateName: bot.template_name,
                address: bot.bot_server_ip,
                botName: bot.name,
                playing: bot.playing,
                defaultChannel: bot.bot_default_channel_name,
                channelCommanderIsOn: bot.bot_channel_commander_is_on,
                panel: newPanel,
            })
            bot.panel_id = newPanel.id
            currentPanel = newPanel
        }

        //////// Change TS3Audiobot Settings //////
        await audioBotHelper.disconnect({ templateName: bot.template_name, panel: currentPanel })

        if (botServerIp && botServerIp !== bot.bot_server_ip) {
            bot.bot_server_ip = botServerIp
            await audioBotHelper.changeConnectAddress({
                templateName: bot.template_name,
                address: botServerIp,
                panel: currentPanel,
            })
        }

        if (botDefaultChannelName && botDefaultChannelName !== bot.bot_default_channel_name) {
            bot.bot_default_channel_name = botDefaultChannelName
            await audioBotHelper.changeConnectChannel({
                templateName: bot.template_name,
                defaultChannel: botDefaultChannelName,
                panel: currentPanel,
            })
        }

        if (botName && botName !== bot.name) {
            bot.name = botName
            await audioBotHelper.changeConnectName({
                templateName: bot.template_name,
                botName: botName,
                panel: currentPanel,
            })
        }
        bot.bot_channel_commander_is_on = botChannelCommanderIsOn
        if (bot.state == "active") {
            await audioBotHelper.connect({ templateName: bot.template_name, panel: currentPanel })
        }
        /////////////////////////////////////////
        if (information) {
            bot.information = information
        }
        if (typeof autorenew == "boolean") {
            bot.autorenew = autorenew
        }

        await bot.save()

        botLogger.info(`بات توسط ${username} ویرایش شد`)
        return res.status(apiCodes.SUCCESS).json(responses.AUDIO_BOT.EDITED)
    } catch (err) {
        console.error(err)
        if (err.status && err.json) {
            return res.status(err.status).json(err.json)
        } else {
            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
        }
    }
}
