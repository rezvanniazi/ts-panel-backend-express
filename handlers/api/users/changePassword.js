const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")

const Users = require("../../../models/Users")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { id } = req.user
        const { currentPassword, newPassword, newPasswordConfirm } = req.body

        const user = await Users.findByPk(id)
        const userLogger = createLogger("user", user.id)
        const currentPasswordIsValid = await user.verifyPassword(currentPassword)

        if (!currentPasswordIsValid) {
            userLogger.error(`تلاش برای تغییر پسورد با پسورد اشتباه توسط ${user.username}`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.USER.NOT_VALID_PASSWORD)
        }
        if (newPassword !== newPasswordConfirm) {
            userLogger.error(`تغییر پسورد ناموفق - پسوردهای جدید مطابقت ندارند توسط ${user.username}`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.USER.NOT_IDENTICAL_PASSWORD)
        }

        await user.update({ password: newPassword })

        userLogger.info(`پسورد توسط ${user.username} تغییر یافت`)
        return res.status(apiCodes.SUCCESS).json(responses.USER.PASSWORD_CHANGED)
    } catch (err) {
        console.error("Error changing password: ", err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
