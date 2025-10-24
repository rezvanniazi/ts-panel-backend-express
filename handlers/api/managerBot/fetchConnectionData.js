const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const serverDataFetch = require("../../../lib/managerBot/serverDataFetch")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { host, username, password, queryPort, serverPort } = req.body
        const userLogger = createLogger("user", req.user.id)

        const data = await serverDataFetch({ host, username, password, queryPort, serverPort })

        userLogger.info(`دریافت اطلاعات سرور توسط ${req.user.username} - هاست: ${host}`)
        return res.status(apiCodes.SUCCESS).json(data)
    } catch (err) {
        if (err.message == "ECONNREFUSED") {
            return res.status(apiCodes.NOT_RUNNING).json(responses.MANAGER_BOT.SERVER_FETCH.ECONNREFUSED)
        } else if (err.message == "INCORRECT_LOGIN") {
            return res.status(apiCodes.FORBIDDEN).json(responses.MANAGER_BOT.SERVER_FETCH.INVALID_LOGIN)
        } else {
            console.log(err)
            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
        }
    }
}
