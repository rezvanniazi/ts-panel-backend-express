const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const { botId } = req.body

        const bot = await Ranksystems.findByPk(botId)
        if (!bot) {
            return res.status(apiCodes.NOT_FOUND).json(responses.RANKSYSTEM.NOT_FOUND)
        }

        if (bot.isExpired()) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.RANKSYSTEM.EXPIRED)
        }

        if (scope == "reseller" && bot.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }
        const panel = RanksystemPanel.getPanel()
        if (!panel?.socket?.connected) {
            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.PANEL.IS_OFFLINE)
        }

        //
        try {
            await panel.activateBot({ templateName: bot.template_name })
            await bot.update({ state: "active", status: "online" })
        } catch (err) {
            return res.status(apiCodes.BAD_REQUEST).json(err.error)
        }

        return res.status(apiCodes.SUCCESS).json(responses.RANKSYSTEM.ACTIVATED)
    } catch (err) {
        console.log(err.message)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
