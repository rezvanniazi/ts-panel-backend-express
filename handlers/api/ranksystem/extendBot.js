const { sequelize } = require("../../../config/database")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")
const RanksystemSettings = require("../../../models/RanksystemSettings")

module.exports = async (req, res) => {
    const transaction = sequelize.transaction()

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
        const settings = await RanksystemSettings.findOne({ raw: true })

        try {
            await user.subtractBalance(settings.price, transaction)
        } catch (err) {
            await transaction.rollback()
            if (err.message == "Insufficient Balance") {
                return res.status(apiCodes.INSUFFICIENT_BALANCE).json(responses.USER.INSUFFICIENT_BALANCE)
            } else {
                console.error(err.message)
                return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
            }
        }
        /////////////////////
        const today = new Date()
        let expires = new Date(bot.expires)
        if (expires < today) {
            expires = today
        }
        expires.setDate(expires.getDate() + 30)
        await bot.update({ expires }, transaction)
        /////////////////
        await transaction.commit()

        return res.status(apiCodes.SUCCESS).json(responses.RANKSYSTEM.EXTENDED)

        //
    } catch (err) {
        await transaction.rollback()
        console.log(err.message)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
