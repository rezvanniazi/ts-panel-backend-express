const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Permissions = require("../../../../models/Permissions")

module.exports = async (req, res) => {
    try {
        const { perms } = req.body

        Object.keys(perms).forEach(async (key) => {
            await Permissions.update({ price: perms[key] }, { where: { name: key } })
        })
        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        console.error("Error updating permissions: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
