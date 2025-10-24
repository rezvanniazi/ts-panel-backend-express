const { createLogger } = require("../utils/logger")
const { randomUUID } = require("crypto")

module.exports = function apiLogger(req, res, next) {
    const startHr = process.hrtime.bigint()
    const requestId = req.headers["x-request-id"] || randomUUID()
    const userId = (req.user && req.user.id) || "public"
    const method = req.method
    const path = req.originalUrl || req.url
    const ip = req.ip || req.connection?.remoteAddress || "unknown"

    const logger = createLogger("api", userId)
    // Log request start
    logger.info(`REQ id=${requestId} ${method} ${path} ip=${ip}`)

    // Log when response finishes
    res.on("finish", () => {
        const endHr = process.hrtime.bigint()
        const durationMs = Number(endHr - startHr) / 1e6
        const status = res.statusCode
        const contentLength = res.getHeader("content-length") || 0
        logger.info(
            `RES id=${requestId} ${method} ${path} status=${status} durationMs=${durationMs.toFixed(
                1
            )} size=${contentLength}`
        )
    })

    next()
}
