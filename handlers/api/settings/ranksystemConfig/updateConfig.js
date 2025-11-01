const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const RanksystemSettings = require("../../../../models/RanksystemSettings")

module.exports = async (req, res) => {
    try {
        const body = req.body

        const data = {
            price: body.price,

            backend_url: body.backend.url,
            backend_token: body.backend.token,
        }

        const oldSettings = await RanksystemSettings.findOne()

        if (oldSettings) {
            await oldSettings.update(data)
        } else {
            await RanksystemSettings.create(data)
        }

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        console.error("Error updating ranksystem config: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
