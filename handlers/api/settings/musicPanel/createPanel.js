const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const MusicBotPanels = require("../../../../models/MusicBotPanels")

module.exports = async (req, res) => {
    try {
        const { name, token, host, maxBot, panelType } = req.body

        // Insert to database
        const data = {
            name,
            token,
            host,
            max_bot: maxBot,
            panel_type: panelType,
        }
        await MusicBotPanels.create(data)

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.MUSIC_PANEL.CREATE_SUCCESS)
    } catch (err) {
        console.error("Create music panel error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
