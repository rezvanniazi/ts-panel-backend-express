const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Users = require("../../../../models/Users")

module.exports = async (req, res) => {
    try {
        const { id } = req.user
        const { customCommands } = req.body

        const user = await Users.findByPk(id)

        let userCustomCommandString = "serveredit "

        for (const [key, value] of Object.entries(customCommands)) {
            if (value !== "") {
                userCustomCommandString += key + "=" + value + " "
            }
        }

        user.global_command = userCustomCommandString
        await user.save()

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        console.error("Error updating custom commands: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
