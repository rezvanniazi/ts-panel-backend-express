const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const tokenConfig = require("../../../config/tokens")
const Tokens = require("../../../models/Tokens")
const jwt = require("jsonwebtoken")
const Users = require("../../../models/Users")
const crypto = require("crypto")
const generateRandomString = require("../../../utils/generateRandomString")

const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex")
}

exports.genToken = async (req, res) => {
    const { id } = req.user
    let { timeInDays } = req.body

    let expires

    const randomId = generateRandomString(15)

    if (typeof timeInDays == "number") {
        const today = new Date()
        today.setDate(today.getDate() + timeInDays)
        expires = today
    } else {
        timeInDays = undefined
    }

    const staticToken = jwt.sign(
        {
            id: randomId,
            type: "staticToken",
        },
        tokenConfig.jwt,
        timeInDays ? { expiresIn: timeInDays } : undefined
    )

    await Tokens.create({ id: randomId, user_id: id, token: staticToken, expires_at: expires }).catch((err) =>
        console.log(err)
    )

    return res.status(apiCodes.SUCCESS).json(staticToken)
}

exports.deleteToken = async (req, res) => {
    try {
        const { id, scope } = req.user
        const { tokenId } = req.body
        const token = await Tokens.findByPk(tokenId)

        if (!token || (scope === "reseller" && token.user_id !== id)) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        await token.destroy()

        return res.status(apiCodes.SUCCESS).json(responses.USER.DELETED)
    } catch (err) {
        console.error("Error deleting token: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.getTokenList = async (req, res) => {
    try {
        const { id, scope } = req.user

        let tokenList
        if (scope == "admin") {
            tokenList = await Tokens.findAll({ include: [{ model: Users, as: "user" }], raw: true })
        } else {
            tokenList = await Tokens.findAll({
                where: { user_id: id },
                include: [{ model: Users, as: "user" }],
                raw: true,
            })
        }
        tokenList = tokenList.map((t) => {
            return {
                tokenId: t.id,
                token: t.token,
                userId: t.user_id,
                expiresAt: t.expires_at,
                user: t["user.username"],
            }
        })
        return res.status(apiCodes.SUCCESS).json(tokenList)
    } catch (err) {
        console.error("Error getTokenList: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
