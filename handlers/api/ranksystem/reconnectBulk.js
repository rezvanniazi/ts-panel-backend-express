const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { RanksystemPanel } = require("../../../lib/ranksystem/RanksystemPanel")
const Ranksystems = require("../../../models/Ranksystems")

module.exports = async (req, res) => {
    try {
        const { username, scope } = req.user
        const { selecteds } = req.body

        let botList
        const panel = RanksystemPanel.getPanel()
        if (!panel || !panel?.socket?.connected) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.PANEL.IS_OFFLINE)
        }

        if (scope == "admin") {
            botList = await Ranksystems.findAll()
        } else {
            botList = await Ranksystems.findAll({ where: { author: username } })
        }

        if (selecteds) {
            botList = botList.filter((b) => selecteds.includes(b.id))
        }

        await Promise.all(
            botList.map((b) => {
                return new Promise((resolve) => {
                    panel.reconnectBot({ templateName: b.template_name })
                    resolve()
                })
            })
        )
        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
        //
    } catch (err) {
        console.log(err.message)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
