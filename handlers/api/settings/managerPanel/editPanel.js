const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const { ManagerBotPanel } = require("../../../../lib/managerBot/ManagerBotPanel")
const ManagerBotPanels = require("../../../../models/ManagerBotPanels")

module.exports = async (req, res) => {
    try {
        const { panelId, token, host, maxBot } = req.body

        // Fetch panel from database and ensure it exists
        const panel = await ManagerBotPanels.findByPk(panelId)

        // Disconnect socket

        if (!panel) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.MANAGER_PANEL.PANEL_NOT_FOUND)
        }

        ManagerBotPanel.delete(panel.id)

        if (token) {
            panel.token = token
        }
        if (host) {
            panel.host = host
        }
        if (maxBot) {
            panel.max_bot = maxBot
        }
        // Create socket connection
        new ManagerBotPanel(panel)

        // Update in database
        await panel.save()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.MANAGER_PANEL.EDIT_SUCCESS)
    } catch (err) {
        console.error("Edit manager panel error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
