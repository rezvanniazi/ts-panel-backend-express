const Users = require("../../../models/Users")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const {
            username,
            password,
            initialBalance,
            scope,
            companyName,
            info,
            canUseBot,
            canUseManagerBot,
            canUseServers,
            canUseRanksystems,
        } = req.body

        const data = {
            username,
            password,
            scope,
            info,
            balance: initialBalance,
            company_name: companyName,
            can_use_bot: canUseBot,
            can_use_manager_bots: canUseManagerBot,
            can_use_servers: canUseServers,
            can_use_ranksystems: canUseRanksystems,
        }
        const newUser = await Users.create(data)
        const userLogger = createLogger("user", req.user.id)
        const newUserLogger = createLogger("user", newUser.id)

        userLogger.info(`کاربر ${username} با اسکوپ ${scope} توسط ${req.user.username} ایجاد شد`)
        newUserLogger.info(`حساب کاربری ${username} ایجاد شد`)

        return res.status(apiCodes.SUCCESS).json(responses.USER.CREATED)
    } catch (err) {
        console.error("Error creating user: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
