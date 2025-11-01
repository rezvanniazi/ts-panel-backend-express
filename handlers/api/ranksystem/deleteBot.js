const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")
const RanksystemSettings = require("../../../models/RanksystemSettings")
const Users = require("../../../models/Users")

const calculateRemainedPrice = (expires, price) => {
    const today = new Date()
    const botExpires = new Date(expires)
    const daysRemaining = Math.max(0, Math.floor((botExpires - today) / (1000 * 60 * 60 * 24)) - 1)

    return Math.floor((price / 30) * daysRemaining)
}

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const { botId } = req.body

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

        try {
            await panel.deleteBot({ templateName: bot.template_name })
            await bot.destroy()
        } catch (err) {
            console.log(err)
            // Todo
        }

        // Calculate remained amount of ranksystem and return to user
        const user = await Users.findOne({ where: { username: bot.author } })
        const settings = await RanksystemSettings.findOne({ raw: true })

        if (user) {
            const remainedAmount = calculateRemainedPrice(bot.expires, settings.price)

            await user.addBalance(remainedAmount)
        }

        return res.status(apiCodes.SUCCESS).json(responses.RANKSYSTEM.DELETED)

        //
    } catch (err) {
        console.log(err.message)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
