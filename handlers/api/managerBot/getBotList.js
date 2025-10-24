const TsManagerBots = require("../../../models/TsManagerBots")
const { createLogger } = require("../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { username, scope, id } = req.user
        const userLogger = createLogger("user", id)

        let botList
        if (scope == "admin") {
            botList = await TsManagerBots.findAll()
        } else {
            botList = await TsManagerBots.findAll({ where: { author: username } })
        }

        userLogger.info(`لیست بات‌های منیجر توسط ${username} درخواست شد - تعداد: ${botList.length}`)
        return botList || []
    } catch (err) {
        console.error(err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
