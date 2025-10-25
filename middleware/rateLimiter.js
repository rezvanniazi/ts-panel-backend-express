const { getCache, setCache } = require("../services/redis/cacheService")
const { createLogger } = require("../utils/logger")
const apiCodes = require("../constants/apiCodes")
const responses = require("../constants/responses")

const logger = createLogger("api", "rate-limiter")

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting configuration
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.keyGenerator - Function to generate cache keys
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100, // 100 requests per window
        keyGenerator = (req) => {
            const userId = req.user?.id || "anonymous"
            const ip = req.ip || req.connection?.remoteAddress || "unknown"
            return `rate_limit:${userId}:${ip}`
        },
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
    } = options

    return async (req, res, next) => {
        try {
            const key = keyGenerator(req)
            const cacheKey = `${key}:${Math.floor(Date.now() / windowMs)}`

            // Get current request count
            let requestCount = await getCache(cacheKey)
            requestCount = requestCount ? parseInt(requestCount) : 0

            // Check if limit exceeded
            if (requestCount >= maxRequests) {
                logger.warn(`Rate limit exceeded for key: ${key}, count: ${requestCount}`)
                return res.status(429).json({
                    ...responses.COMMON.RATE_LIMIT_EXCEEDED,
                    retryAfter: Math.ceil(windowMs / 1000),
                })
            }

            // Increment counter
            await setCache(cacheKey, requestCount + 1, Math.ceil(windowMs / 1000))

            // Add rate limit headers
            res.setHeader("X-RateLimit-Limit", maxRequests)
            res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - requestCount - 1))
            res.setHeader("X-RateLimit-Reset", new Date(Date.now() + windowMs).toISOString())

            // Handle response to potentially skip counting
            const originalSend = res.send
            res.send = function (data) {
                const shouldSkip =
                    (skipSuccessfulRequests && res.statusCode < 400) || (skipFailedRequests && res.statusCode >= 400)

                if (shouldSkip) {
                    // Decrement counter if we should skip this request
                    setCache(cacheKey, Math.max(0, requestCount), Math.ceil(windowMs / 1000))
                }

                return originalSend.call(this, data)
            }

            next()
        } catch (error) {
            logger.error(`Rate limiter error: ${error.message}`)
            // Continue on error to avoid blocking requests
            next()
        }
    }
}

// Pre-configured rate limiters
const rateLimiters = {
    // General API rate limiter
    general: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
    }),

    // Strict rate limiter for authentication endpoints
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10,
        keyGenerator: (req) => {
            const ip = req.ip || req.connection?.remoteAddress || "unknown"
            return `auth_rate_limit:${ip}`
        },
    }),

    // More lenient rate limiter for authenticated users
    authenticated: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 500,
        keyGenerator: (req) => {
            const userId = req.user?.id || "anonymous"
            return `auth_user_rate_limit:${userId}`
        },
    }),

    // Socket creation rate limiter
    socketCreation: createRateLimiter({
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 20,
        keyGenerator: (req) => {
            const userId = req.user?.id || "anonymous"
            return `socket_creation_rate_limit:${userId}`
        },
    }),
}

module.exports = {
    createRateLimiter,
    rateLimiters,
}
