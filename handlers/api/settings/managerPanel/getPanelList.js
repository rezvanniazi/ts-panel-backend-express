const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const { ManagerBotPanel } = require("../../../../lib/managerBot/ManagerBotPanel")
const ManagerBotPanels = require("../../../../models/ManagerBotPanels")

module.exports = async (req, res) => {
    try {
        // Fetch All from database
        const panelList = await ManagerBotPanels.findAll({ raw: true })

        // Get status
        for (let p of panelList) {
            const connectionInfo = ManagerBotPanel.getPanel(p.id)
            p.status = connectionInfo?.socket?.connected ? "online" : "offline"
        }

        return res.status(apiCodes.SUCCESS).json(panelList)
    } catch (err) {
        console.error("Get music panel list error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
