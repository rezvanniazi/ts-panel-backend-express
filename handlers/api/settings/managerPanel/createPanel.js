const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const { ManagerBotPanel } = require("../../../../lib/managerBot/ManagerBotPanel")
const ManagerBotPanels = require("../../../../models/ManagerBotPanels")

module.exports = async (req, res) => {
    try {
        const { name, token, host, maxBot } = req.body

        // Insert to database
        const data = {
            name,
            token,
            host,
            max_bot: maxBot,
        }
        const panel = await ManagerBotPanels.create(data)

        // initialize socket connection
        new ManagerBotPanel(panel)

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.MANAGER_PANEL.CREATE_SUCCESS)
    } catch (err) {
        console.error("Create manager panel error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
