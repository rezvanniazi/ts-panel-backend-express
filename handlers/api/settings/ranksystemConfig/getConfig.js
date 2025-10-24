const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const RanksystemSettings = require("../../../../models/RanksystemSettings")

module.exports = async (req, res) => {
    try {
        const settings = await RanksystemSettings.findOne()

        const response = {
            price: settings?.price,

            backend: {
                url: settings?.backend_url,
                token: settings?.backend_token,
            },
        }

        return res.status(apiCodes.SUCCESS).json(response)
    } catch (err) {
        console.error("Error getting ranksystem config: ")

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
