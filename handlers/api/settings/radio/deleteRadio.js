const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Radios = require("../../../../models/Radios")

module.exports = async (req, res) => {
    try {
        const { radioId } = req.body

        // Fetch radio and ensure it exists
        const radio = await Radios.findByPk(radioId)
        if (!radio) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.RADIOS.NOT_FOUND)
        }

        // Delete radio from database

        await radio.destroy()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.RADIOS.DELETE_SUCCESS)
    } catch (err) {
        console.error("Error deleting radio: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
