const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const MusicBotPanels = require("../../../../models/MusicBotPanels")

module.exports = async (req, res) => {
    try {
        // Fetch All from database
        const panelList = await MusicBotPanels.findAll()

        return res.status(apiCodes.SUCCESS).json(panelList)
    } catch (err) {
        console.error("Get music panel list error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
