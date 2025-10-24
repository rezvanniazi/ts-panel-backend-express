const winston = require("winston")
const path = require("path")
const fs = require("fs")

// Ensure logs directory exists
const logsDir = path.join(__dirname, "logs")
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir)
}

const jalaliTimestamp = winston.format((info) => {
    info.timestamp = jmoment().format("jYYYY/jMM/jDD HH:mm:ss")
    return info
})

// Store loggers in a cache to avoid recreating them
const loggerCache = new Map()

/**
 * Get or create a logger for a specific service and ID.
 * @param {string} serviceName - e.g., 'users', 'audiobot'
 * @param {string} serviceId - e.g., '1', 'server1', 'instance-5'
 * @returns {winston.Logger}
 */
module.exports = (serviceName, serviceId) => {
    const cacheKey = `${serviceName}-${serviceId}`

    // Return cached logger if it exists
    if (loggerCache.has(cacheKey)) {
        return loggerCache.get(cacheKey)
    }

    // Create a new logger for this service + ID
    const logger = winston.createLogger({
        level: "info",
        format: winston.format.combine(jalaliTimestamp(), winston.format.json()),
        transports: [
            // Console logging (optional)
            new winston.transports.Console({
                format: winston.format.printf((info) => {
                    return `[${serviceName}:${serviceId}] ${info.level}: ${info.message}`
                }),
            }),
            // File logging (unique per service + ID)
            new winston.transports.File({
                filename: path.join(logsDir, `${serviceName}-${serviceId}.log`),
                format: winston.format.printf((info) => {
                    return `${info.timestamp} [${serviceName}:${serviceId}] ${info.level}: ${info.message}`
                }),
            }),
        ],
    })

    // Cache the logger for future use
    loggerCache.set(cacheKey, logger)
    return logger
}
