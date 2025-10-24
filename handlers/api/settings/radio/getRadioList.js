const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Radios = require("../../../../models/Radios")

module.exports = async (req, res) => {
    try {
        const radioList = await Radios.findAll()

        return res.status(apiCodes.SUCCESS).json(radioList)
    } catch (err) {
        console.error("Error getting radio list: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
