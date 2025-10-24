const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const Users = require("../../../models/Users")

const getUserList = async (req, res) => {
    try {
        let users = await Users.findAll({ raw: true })
        users.forEach((u) => delete u.password)

        return res.status(apiCodes.SUCCESS).json(users)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

module.exports = getUserList
