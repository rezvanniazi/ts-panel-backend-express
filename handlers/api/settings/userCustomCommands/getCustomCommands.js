const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const Users = require("../../../../models/Users")

module.exports = async (req, res) => {
    try {
        const { id } = req.user

        const user = await Users.findByPk(id, { raw: true })
        let userCustomCommands = {}

        user.global_command
            ?.replace("serveredit ", "")
            .split(" ")
            .map((command) => {
                const [key, value] = command.split("=")
                if (key !== "") {
                    userCustomCommands[key] = value?.toString().replaceAll("\\s", " ")
                }
            })
        return res.status(apiCodes.SUCCESS).json(userCustomCommands)
    } catch (err) {
        console.error("Error getting custom commands: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
