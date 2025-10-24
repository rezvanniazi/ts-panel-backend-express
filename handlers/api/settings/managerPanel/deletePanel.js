const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const { ManagerBotPanel } = require("../../../../lib/managerBot/ManagerBotPanel")
const ManagerBotPanels = require("../../../../models/ManagerBotPanels")

module.exports = async (req, res) => {
    try {
        const { panelId } = req.body
        // Fetch panel from database and ensure it exists
        const panel = await ManagerBotPanels.findByPk(panelId)
        if (!panel) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.MANAGER_PANEL.PANEL_NOT_FOUND)
        }

        // Disconnect socket
        ManagerBotPanel.delete(panel.id)

        // Delete from database
        await panel.destroy()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.MANAGER_PANEL.DELETE_SUCCESS)
    } catch (err) {
        console.error("Delete manager panel error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
