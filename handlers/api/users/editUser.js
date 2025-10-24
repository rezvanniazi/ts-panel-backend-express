const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Users = require("../../../models/Users")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const {
            userId,
            password,
            balance,
            scope,
            companyName,
            info,
            canUseBot,
            canUseManagerBot,
            canUseServers,
            canUseRanksystems,
        } = req.body

        const user = await Users.findByPk(userId)
        const userLogger = createLogger("user", req.user.id)
        const targetUserLogger = createLogger("user", userId)

        if (!user) {
            userLogger.error(`کاربر با ایدی ${userId} توسط ${req.user.username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.USER.NOT_FOUND)
        }

        if (password) {
            user.password = password
        }
        if (balance) {
            user.balance = balance
        }
        if (scope) {
            user.scope = scope
        }
        if (companyName) {
            user.company_name = companyName
        }
        if (canUseBot) {
            user.can_use_bot = canUseBot
        }
        if (canUseManagerBot) {
            user.can_use_manager_bots = canUseManagerBot
        }
        if (canUseServers) {
            user.can_use_servers = canUseServers
        }
        if (canUseRanksystems) {
            user.can_use_ranksystems = canUseRanksystems
        }
        user.info = info

        await user.save()

        userLogger.info(`کاربر ${user.username} توسط ${req.user.username} ویرایش شد`)
        targetUserLogger.info(`اطلاعات حساب کاربری توسط ${req.user.username} ویرایش شد`)

        return res.status(apiCodes.SUCCESS).json(responses.USER.EDITED)
    } catch (err) {
        console.error("Error editing user: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
