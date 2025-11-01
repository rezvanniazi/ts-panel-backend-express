const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const { botId, confuser, confpass, information, autorenew } = req.body

        const bot = await Ranksystems.findByPk(botId)
        if (!bot) {
            return res.status(apiCodes.NOT_FOUND).json(responses.RANKSYSTEM.NOT_FOUND)
        }

        if (scope == "reseller" && bot.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        const panel = RanksystemPanel.getPanel()
        if (!panel?.socket?.connected) {
            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.PANEL.IS_OFFLINE)
        }
        //
        if (
            (confuser && confuser !== "" && confuser !== bot.username && bot.status == "online") ||
            (confpass && confpass !== "" && confpass !== bot.password && bot.status == "online")
        ) {
            await panel.changeWebInterface({ templateName: bot.template_name, username: confuser, password: confpass })
            await bot.update({ username: confuser, password: confpass })
        }

        if (autorenew && autorenew !== bot.autorenew) {
            await bot.update({ autorenew })
        }

        if (information) {
            await bot.update({ information })
        }

        ///
        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
