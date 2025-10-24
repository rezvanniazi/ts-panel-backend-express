const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const { generateAccessToken } = require("../../../middleware/auth")
const Users = require("../../../models/Users")
const Bcrypt = require("bcryptjs")
const RefreshTokens = require("../../../models/RefreshTokens")
const { Op } = require("sequelize")
const jwt = require("jsonwebtoken")
const tokens = require("../../../config/tokens")
const crypto = require("crypto")

// Generate both access and refresh tokens
const generateTokens = (user) => {
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

    const refreshToken = jwt.sign(
        {
            id: user.id,
            type: "refresh",
        },
        tokens.jwtRefresh,
        { expiresIn: "7d" }
    )

    return { accessToken, refreshToken }
}

// Hash refresh token for storage
const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex")
}

// Store a new refresh token
const storeRefreshToken = async (userId, refreshToken, expiresAt) => {
    const tokenHash = hashToken(refreshToken)

    return await RefreshTokens.create({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
    })
}

// Validate refresh token
const validateRefreshToken = async (refreshToken) => {
    try {
        // Verify JWT
        const decoded = jwt.verify(refreshToken, tokens.jwtRefresh)

        if (decoded.type !== "refresh") {
            return null
        }

        const tokenHash = hashToken(refreshToken)

        const token = await RefreshTokens.findOne({
            where: {
                token_hash: tokenHash,
                revoked: false,
                expires_at: {
                    [Op.gt]: new Date(), // Not expired
                },
            },
            include: [
                {
                    model: Users,
                    as: "user",
                },
            ],
        })

        return token
    } catch (error) {
        return null
    }
}

// Update refresh token (for rotation)
const updateRefreshToken = async (userId, oldRefreshToken, newRefreshToken, newExpiresAt) => {
    const oldTokenHash = hashToken(oldRefreshToken)
    const newTokenHash = hashToken(newRefreshToken)

    // Revoke old token
    await RefreshTokens.update({ revoked: true }, { where: { token_hash: oldTokenHash } })

    // Store new token
    return await storeRefreshToken(userId, newRefreshToken, newExpiresAt)
}

// Revoke all tokens for a user
const revokeUserTokens = async (userId) => {
    return await RefreshTokens.update({ revoked: true }, { where: { user_id: userId } })
}

// Clean up expired tokens
const cleanupExpiredTokens = async () => {
    return await RefreshTokens.destroy({
        where: {
            expires_at: {
                [Op.lt]: new Date(), // Expired
            },
        },
    })
}

const authenticate = async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({
                error: "Username and password are required",
            })
        }

        const user = await Users.findOne({ where: { username: username }, raw: true })

        if (!user) {
            return res.status(apiCodes.FORBIDDEN).json(responses.USER.INVALID_AUTH)
        }

        const isValid = await Bcrypt.compare(password, user.password.toString())

        if (isValid) {
            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user)

            // Calculate expiration
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

            // Store refresh token
            await storeRefreshToken(user.id, refreshToken, expiresAt)

            return res.status(apiCodes.SUCCESS).json({
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: 900, // 15 minutes
            })
        } else {
            return res.status(apiCodes.FORBIDDEN).json(responses.USER.INVALID_AUTH)
        }
    } catch (error) {
        console.error("Authentication error:", error)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json({
            error: "Internal server error",
        })
    }
}

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body

        if (!refreshToken) {
            return res.status(apiCodes.BAD_REQUEST).json({
                error: "Refresh token is required",
            })
        }

        // Validate refresh token
        const tokenRecord = await validateRefreshToken(refreshToken)

        if (!tokenRecord) {
            return res.status(apiCodes.UNAUTHORIZED).json({
                error: "Invalid or expired refresh token",
            })
        }

        // Get user data
        const user = tokenRecord.user
        if (!user) {
            return res.status(apiCodes.UNAUTHORIZED).json({
                error: "User not found",
            })
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user)

        // Calculate new expiration
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

        // Update refresh token in database (rotate)
        await updateRefreshToken(user.id, refreshToken, newRefreshToken, expiresAt)

        res.status(apiCodes.SUCCESS).json({
            token: accessToken,
            refresh_token: newRefreshToken,
            expires_in: 900, // 15 minutes
        })
    } catch (error) {
        console.error("Token refresh error:", error)
        res.status(401).json({
            error: "Invalid refresh token",
        })
    }
}

const logout = async (req, res) => {
    try {
        const { refresh_token } = req.body

        if (refresh_token) {
            const tokenHash = hashToken(refresh_token)

            // Revoke the specific token
            await RefreshTokens.update({ revoked: true }, { where: { token_hash: tokenHash } })
        }

        res.status(apiCodes.SUCCESS).json({
            message: "Logged out successfully",
        })
    } catch (error) {
        console.error("Logout error:", error)
        res.status(500).json({
            error: "Internal server error",
        })
    }
}

module.exports = { authenticate, refresh, logout }
