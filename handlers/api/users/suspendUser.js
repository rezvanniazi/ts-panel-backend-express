const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Users = require("../../../models/Users")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { userId } = req.body

        const user = await Users.findByPk(userId)
        const userLogger = createLogger("user", req.user.id)
        const targetUserLogger = createLogger("user", userId)

        if (!user) {
            userLogger.error(`کاربر با ایدی ${userId} توسط ${req.user.username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.USER.NOT_FOUND)
        }
        user.status = "suspended"

        userLogger.info(`کاربر ${user.username} توسط ${req.user.username} معلق شد`)
        targetUserLogger.info(`حساب کاربری توسط ${req.user.username} معلق شد`)

        return res.status(apiCodes.SUCCESS).json(responses.USER.SUSPENDED)
    } catch (err) {
        console.error("Error suspending user: ", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
