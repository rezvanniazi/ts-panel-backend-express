const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Radios = require("../../../../models/Radios")

module.exports = async (req, res) => {
    try {
        const { radioId, name, url, information } = req.body

        // Fetch radio and ensure it exists
        const radio = await Radios.findByPk(radioId)
        if (!radio) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.RADIOS.NOT_FOUND)
        }

        // Find changes
        if (name) {
            radio.name = name
        }
        if (url) {
            radio.url = url
        }
        if (information) {
            radio.information = information
        }

        // Update in database
        await radio.save()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.RADIOS.EDITED_SUCCESS)
    } catch (err) {
        console.error("Error editing radio: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
