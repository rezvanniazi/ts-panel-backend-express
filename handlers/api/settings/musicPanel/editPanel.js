const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const MusicBotPanels = require("../../../../models/MusicBotPanels")

module.exports = async (req, res) => {
    try {
        const { panelId, token, host, maxBot, panelType } = req.body

        // Fetch panel from database and ensure it exists
        const panel = await MusicBotPanels.findByPk(panelId)
        if (!panel) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.MUSIC_PANEL.PANEL_NOT_FOUND)
        }

        if (token) {
            panel.token = token
        }
        if (host) {
            panel.host = host
        }
        if (maxBot) {
            panel.max_bot = maxBot
        }
        if (panelType) {
            panel.panel_type = panelType
        }

        // Update in database
        await panel.save()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.MUSIC_PANEL.EDIT_SUCCESS)
    } catch (err) {
        console.error("Edit music panel error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
