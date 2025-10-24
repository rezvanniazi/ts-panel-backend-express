const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Permissions = require("../../../../models/Permissions")

module.exports = async (req, res) => {
    try {
        const permissionList = await Permissions.findAll()

        return res.status(apiCodes.SUCCESS).json(permissionList)
    } catch (err) {
        console.error("Error getPermissions: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
