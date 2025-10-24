const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Radios = require("../../../../models/Radios")

module.exports = async (req, res) => {
    try {
        const { name, url, information } = req.body

        // Insert radio to database

        const radio = await Radios.create({ name, url, information })

        return res.status(apiCodes.SUCCESS).json(radio)
    } catch (err) {
        console.error("Error adding radio: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
