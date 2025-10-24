const tokens = require("../config/tokens")
const jwt = require("jsonwebtoken")
const config = require("../config")
const responses = require("../constants/responses")
const apiCodes = require("../constants/apiCodes")

const generateAccessToken = (user) => {
    const accessToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            scope: user.scope,
            companyName: user.company_name,
            canUseAudioBot: user.can_use_bot,
            canUseServers: user.can_use_servers,
            canUseRanksystems: user.can_use_ranksystems,
            canUseManagerBot: user.can_use_manager_bots,
        },
        tokens.jwt,
        { expiresIn: "15m" }
    )
    const refreshToken = jwt.sign({ id: user.id, type: "refresh" }, tokens.jwtRefresh, { expiresIn: "7d" })

    return { accessToken, refreshToken }
}

const jwtAuth = (req, res, next, token) => {
    if (!token) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    jwt.verify(token, tokens.jwt, (err, user) => {
        if (err) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        req.user = user

        next()
    })
}

const staticTokenAuth = (req, res, next, token) => {
    if (!token || token !== tokens.apiToken) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.INVALID_TOKEN)
    }

    next()
}

const tokenAuth = (req, res, next) => {
    // Skip token auth if is authentication
    if (
        req.originalUrl === "/api/user/authenticate" ||
        req.originalUrl.includes("/socketadmin") ||
        req.originalUrl.includes("/api-docs")
    ) {
        return next()
    }
    const authHeader = req.header("Authorization")
    if (!authHeader) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.INVALID_TOKEN)
    }
    const [method, token] = authHeader.split(" ")

    if (method && method == "Bearer") {
        jwtAuth(req, res, next, token)
    } else if (method && method == "X-API-KEY") {
        staticTokenAuth(req, res, next, token)
    } else {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.INVALID_TOKEN)
    }
}

const socketAuth = (req, res, next) => {
    const isHandshake = req._query.sid === undefined
    if (!isHandshake) {
        return next()
    }

    // Admin UI connection with secret key

    if (req._query.adminSecret) {
        if (req._query.adminSecret.split("/")[0] === config.socketAdmin.adminSecret) {
            req.user = { id: "socketadmin", username: "socketadmin", scope: "admin", isAdmin: true }
            return next()
        } else {
            return next(new Error("Invalid admin secret"))
        }
    }

    const header = req.headers["authorization"]

    if (!header) {
        return next(new Error("no token"))
    }

    if (!header.startsWith("Bearer ")) {
        return next(new Error("invalid token"))
    }

    const token = header.substring(7)

    jwt.verify(token, tokens.jwt, (err, decoded) => {
        if (err) {
            return next(new Error("invalid token"))
        }
        req.user = decoded
        next()
    })
}

module.exports = { tokenAuth, generateAccessToken, socketAuth }
