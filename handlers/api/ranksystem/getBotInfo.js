const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const { botId } = req.body

        const bot = await Ranksystems.findByPk(botId, { raw: true })
        if (!bot) {
            return res.status(apiCodes.NOT_FOUND).json(responses.RANKSYSTEM.NOT_FOUND)
        }

        if (scope == "reseller" && bot.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        return res.status(apiCodes.SUCCESS).json(bot)
        //
    } catch (err) {
        console.log(err.message)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
