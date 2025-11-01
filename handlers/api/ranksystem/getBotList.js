const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user

        let botList
        if (scope == "admin") {
            botList = await Ranksystems.findAll()
        } else {
            botList = await Ranksystems.findAll({ where: { author: username } })
        }

        return res.status(apiCodes.SUCCESS).json(botList)
    } catch (err) {
        console.log(err.message)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
