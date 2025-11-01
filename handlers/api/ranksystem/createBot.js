const { sequelize } = require("../../../config/database")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")
const RanksystemSettings = require("../../../models/RanksystemSettings")
const Users = require("../../../models/Users")

module.exports = async (req, res) => {
    const transaction = await sequelize.transaction()
    try {
        const { id: userId } = req.user

        const { templateName, confuser, confpass, information } = req.body
        const panel = RanksystemPanel.getPanel()
        const user = await Users.findByPk(userId)

        if (!panel || !panel?.socket?.connected) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.IS_OFFLINE)
        }
        const templateNameIsNotValid = await Ranksystems.findOne({ where: { template_name: templateName } })
        if (templateNameIsNotValid) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.RANKSYSTEM.TEMPLATE_NAME_NOT_VALID)
        }

        const settings = await RanksystemSettings.findOne({ raw: true })

        ///////////////////Subtract balance//////////////////////
        try {
            await user.subtractBalance(settings.price, transaction)
        } catch (err) {
            await transaction.rollback()
            if (err.message == "Insufficient balance") {
                return res.status(apiCodes.INSUFFICIENT_BALANCE).json(responses.USER.INSUFFICIENT_BALANCE)
            } else {
                console.error(err)
                return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
            }
        }
        ///////////////////////////////////////
        try {
            await panel.createBot({ templateName, confweb: { user: confuser, pass: confpass } })
        } catch (err) {
            await transaction.rollback()
            // Todo
            return res.status(apiCodes.BAD_REQUEST).json(err.error)
        }

        // Calculate 30 days for expires
        let today = new Date()
        today.setDate(today.getDate() + 30)
        const expires = today
        ////////////////////////////////

        const bot = await Ranksystems.create(
            {
                template_name: templateName,
                expires,
                username: confuser,
                password: confpass,
                author: user.username,
                information,
            },
            { transaction }
        )

        await transaction.commit()

        return res.status(apiCodes.SUCCESS).json({ ...responses.RANKSYSTEM.CREATED, bot })
        //
    } catch (err) {
        await transaction.rollback()
        console.log(err.message)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
