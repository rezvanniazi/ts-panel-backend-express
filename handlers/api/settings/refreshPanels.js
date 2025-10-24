const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const PanelSyncJobs = require("../../../jobs/panelSyncJobs")

module.exports = async (req, res) => {
    const panelSyncJobs = new PanelSyncJobs()
    await panelSyncJobs.checkAudiobotPanels()
    await panelSyncJobs.checkManagerbotPanels()

    return res.status(apiCodes.SUCCESS).json(responses.PANEL.REFRESHED)
}
