const fs = require("fs")
const path = require("path")
const winston = require("winston")
const jmoment = require("jalali-moment")

// Module-level state
const baseLogDir = path.join(process.cwd(), "logs")
const allowedServices = new Set([
    "audiobot",
    "panelSyncJobs",
    "managerBot",
    "teamspeak",
    "expirationJobs",
    "teamspeakJobs",
    "managerPanel",
    "musicPanel",
    "permission",
    "radio",
    "ranksystem",
    "serverPackage",
    "audioBotPackage",
    "logsService",
    "user",
    "socket",
    "api",
])
const loggerCache = new Map()

const jalaliFormat = winston.format((info) => {
    info.timestamp = jmoment().format("jYYYY/jMM/jDD HH:mm:ss")
    return info
})

function ensureBaseDirectories() {
    if (!fs.existsSync(baseLogDir)) {
        fs.mkdirSync(baseLogDir, { recursive: true })
    }
    for (const service of allowedServices) {
        const serviceDir = path.join(baseLogDir, service)
        if (!fs.existsSync(serviceDir)) {
            fs.mkdirSync(serviceDir, { recursive: true })
        }
        const allLogFile = path.join(serviceDir, "allLog.log")
        if (!fs.existsSync(allLogFile)) {
            fs.closeSync(fs.openSync(allLogFile, "a"))
        }
    }
}

function validateService(service) {
    if (!allowedServices.has(service)) {
        throw new Error(`Invalid service: ${service}. Allowed: ${Array.from(allowedServices).join(", ")}`)
    }
}

function getCacheKey(service, id) {
    return `${service}:${id}`
}

function createTransports(service, id) {
    const transports = []

    // Console transport
    transports.push(
        new winston.transports.Console({
            format: winston.format.printf((info) => {
                return `[${service}:${id}] ${info.level}: ${`\u202B${info.message}\u202C`}`
            }),
        })
    )

    // Per-id file transport
    const idFilePath = path.join(baseLogDir, service, `${id}.log`)
    transports.push(
        new winston.transports.File({
            filename: idFilePath,
            format: winston.format.printf((info) => {
                return `${info.timestamp} [${service}:${id}] ${info.level}: ${`\u202B${info.message}\u202C`}`
            }),
        })
    )

    // All-log transport per service
    const allLogPath = path.join(baseLogDir, service, "allLog.log")
    transports.push(
        new winston.transports.File({
            filename: allLogPath,
            format: winston.format.printf((info) => {
                return `${info.timestamp} [${service}:${id}] ${info.level}: ${`\u202B${info.message}\u202C`}`
            }),
        })
    )

    return transports
}

function getLogger(service, id) {
    validateService(service)
    if (!id) throw new Error("id is required")

    const key = getCacheKey(service, id)
    if (loggerCache.has(key)) return loggerCache.get(key)

    const logger = winston.createLogger({
        level: "info",
        format: winston.format.combine(
            jalaliFormat(),
            winston.format.json(),
            winston.format.printf(({ message }) => {
                return `\u202B${message}\u202C`
            })
        ),
        transports: createTransports(service, id),
    })

    loggerCache.set(key, logger)
    return logger
}

ensureBaseDirectories()

const createLogger = (service, id) => {
    return {
        info: (message) => getLogger(service, id).info(message),
        warn: (message) => getLogger(service, id).warn(message),
        error: (message) => getLogger(service, id).error(message),
        log: (message) => getLogger(service, id).log({ level, message }),
    }
}

function clearLog(service, id = null) {
    try {
        validateService(service)
    } catch (error) {
        return { success: false, message: error.message }
    }

    const serviceDir = path.join(baseLogDir, service)

    if (!fs.existsSync(serviceDir)) {
        return { success: false, message: `Service directory ${service} does not exist` }
    }

    try {
        if (id) {
            // Clear specific ID log file
            const idFilePath = path.join(serviceDir, `${id}.log`)
            if (fs.existsSync(idFilePath)) {
                fs.writeFileSync(idFilePath, "")
                // Also remove from cache
                const key = getCacheKey(service, id)
                if (loggerCache.has(key)) {
                    loggerCache.delete(key)
                }
                return { success: true, message: `Cleared log for ${service}:${id}` }
            } else {
                return { success: false, message: `Log file for ${service}:${id} does not exist` }
            }
        } else {
            // Clear all logs for the service
            const files = fs.readdirSync(serviceDir)
            let clearedCount = 0

            files.forEach((file) => {
                if (file.endsWith(".log")) {
                    const filePath = path.join(serviceDir, file)
                    fs.writeFileSync(filePath, "")
                    clearedCount++
                }
            })

            // Clear cache for this service
            for (const [key] of loggerCache) {
                if (key.startsWith(`${service}:`)) {
                    loggerCache.delete(key)
                }
            }

            return {
                success: true,
                message: `Cleared ${clearedCount} log files for service ${service}`,
            }
        }
    } catch (error) {
        return {
            success: false,
            message: `Failed to clear logs: ${error.message}`,
        }
    }
}

module.exports = { createLogger, clearLog }
