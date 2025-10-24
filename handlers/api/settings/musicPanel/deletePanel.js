const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const MusicBotPanels = require("../../../../models/MusicBotPanels")

module.exports = async (req, res) => {
    try {
        const { panelId } = req.body
        // Fetch panel from database and ensure it exists
        const panel = await MusicBotPanels.findByPk(panelId)
        if (!panel) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.MUSIC_PANEL.PANEL_NOT_FOUND)
        }

        // Delete from database
        await panel.destroy()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.MUSIC_PANEL.DELETE_SUCCESS)
    } catch (err) {
        console.error("Delete music panel error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
