const { getCache, setCache } = require("../services/redis/cacheService")
const { createLogger } = require("../utils/logger")
const responses = require("../constants/responses")

const logger = createLogger("socket", "cooldown")

/**
 * Socket cooldown middleware to prevent rapid reconnections
 * @param {Object} options - Cooldown configuration
 */
const createSocketCooldown = (options = {}) => {
    const {
        cooldownMs = 5000, // 5 seconds cooldown
        maxConnectionsPerMinute = 10,
        keyGenerator = (socket) => {
            const userId = socket.request.user?.id
            const ip = socket.handshake.address || "unknown"
            return `socket_cooldown:${userId}:${ip}`
        },
        exemptUsers = [], // Array of user IDs exempt from cooldown
    } = options

    return async (socket, next) => {
        try {
            // Bypass cooldown for admin UI namespace
            const nsp = socket.nsp?.name
            if (nsp === "/socketadmin") {
                return next()
            }

            const user = socket.request.user
            const userId = user?.id
            const ip = socket.handshake.address

            // Check if user is exempt
            if (userId && exemptUsers.includes(userId)) {
                return next()
            }

            const key = keyGenerator(socket)
            const connectionKey = `${key}:connections`
            const lastConnectionKey = `${key}:last_connection`

            // Check last connection time
            const lastConnection = await getCache(lastConnectionKey)
            const now = Date.now()

            if (lastConnection) {
                const timeSinceLastConnection = now - parseInt(lastConnection)

                if (timeSinceLastConnection < cooldownMs) {
                    const remainingCooldown = cooldownMs - timeSinceLastConnection
                    logger.warn(
                        `Socket connection blocked due to cooldown. User: ${user.username}, IP: ${ip}, Remaining: ${remainingCooldown}ms`
                    )

                    return next(
                        new Error(
                            JSON.stringify({
                                ...responses.COMMON.SOCKET_COOLDOWN,
                                cooldownRemaining: remainingCooldown,
                            })
                        )
                    )
                }
            }

            // Check connections per minute
            const connectionsInLastMinute = (await getCache(connectionKey)) || 0
            const connectionCount = parseInt(connectionsInLastMinute)

            if (connectionCount >= maxConnectionsPerMinute) {
                logger.warn(
                    `Socket connection blocked due to too many connections. User: ${user.username}, IP: ${ip}, Count: ${connectionCount}`
                )

                return next(
                    new Error(
                        JSON.stringify({
                            ...responses.COMMON.RATE_LIMIT_EXCEEDED,
                            connectionCount,
                            maxConnections: maxConnectionsPerMinute,
                        })
                    )
                )
            }

            // Update connection tracking
            await setCache(lastConnectionKey, now.toString(), Math.ceil(cooldownMs / 1000))
            await setCache(connectionKey, (connectionCount + 1).toString(), 60) // 1 minute TTL

            logger.info(`Socket connection allowed. User: ${user.username}, IP: ${ip}`)
            next()
        } catch (error) {
            logger.error(`Socket cooldown error: ${error.message}`)
            // Continue on error to avoid blocking connections
            next()
        }
    }
}

// Pre-configured cooldown middleware
const socketCooldowns = {
    // Default cooldown for all connections
    default: createSocketCooldown({
        cooldownMs: 5000, // 5 seconds
        maxConnectionsPerMinute: 10,
    }),

    // Lenient cooldown for admin users
    admin: createSocketCooldown({
        cooldownMs: 1000, // 1 second
        maxConnectionsPerMinute: 50,
        exemptUsers: [], // Can be populated with admin user IDs
    }),
}

module.exports = {
    createSocketCooldown,
    socketCooldowns,
}
