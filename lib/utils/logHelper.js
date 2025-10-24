const fs = require("fs")
const path = require("path")
const jmoment = require("jalali-moment")

// Log types configuration
const LOG_TYPES = {
    API: "api",
    AUDIO_BOT: "audiobot",
    MANAGER_BOT: "managerBot",
    TEAMSPEAK: "teamspeak",
    USER: "user",
    SOCKET: "socket",
    EXPIRATION_JOBS: "expirationJobs",
    TEAMSPEAK_JOBS: "teamspeakJobs",
    PANEL_SYNC_JOBS: "panelSyncJobs",
    MANAGER_PANEL: "managerPanel",
    MUSIC_PANEL: "musicPanel",
    PERMISSION: "permission",
    RADIO: "radio",
    RANKSYSTEM: "ranksystem",
    SERVER_PACKAGE: "serverPackage",
    AUDIO_BOT_PACKAGE: "audioBotPackage",
    CRONJOB: "cronjob",
}

// Base logs directory
const BASE_LOG_DIR = path.join(process.cwd(), "logs")

/**
 * Check if a log type is valid
 * @param {string} logType - The log type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidLogType(logType) {
    return Object.values(LOG_TYPES).includes(logType)
}

/**
 * Check if user has permission to access a log type
 * @param {Object} user - User object
 * @param {string} logType - Log type to check
 * @returns {boolean} - True if user has permission
 */
function hasLogPermission(user, logType) {
    // Admin can access all logs
    if (user.scope === "admin") {
        return true
    }

    // Regular users can only access their own logs and public logs
    const publicLogTypes = [
        LOG_TYPES.API,
        LOG_TYPES.USER,
        LOG_TYPES.AUDIO_BOT,
        LOG_TYPES.TEAMSPEAK,
        LOG_TYPES.MANAGER_BOT,
        LOG_TYPES.RANKSYSTEM,
    ]
    return publicLogTypes.includes(logType)
}

/**
 * Get list of log files for a specific log type
 * @param {string} logType - The log type
 * @returns {Promise<Array>} - Array of log file names
 */
async function getLogFiles(logType) {
    try {
        if (!isValidLogType(logType)) {
            throw new Error("Invalid log type")
        }

        const logDir = path.join(BASE_LOG_DIR, logType)

        if (!fs.existsSync(logDir)) {
            return []
        }

        const files = fs.readdirSync(logDir)
        return files.filter((file) => file.endsWith(".log"))
    } catch (error) {
        throw new Error(`Failed to get log files: ${error.message}`)
    }
}

/**
 * Read log file content with filtering and pagination
 * @param {string} logType - The log type
 * @param {string} fileName - The log file name
 * @param {Object} options - Filtering and pagination options
 * @returns {Promise<Object>} - Log data with content and metadata
 */
async function readLogFile(logType, fileName, options = {}) {
    try {
        if (!isValidLogType(logType)) {
            throw new Error("Invalid log type")
        }

        const logFilePath = path.join(BASE_LOG_DIR, logType, `${fileName}.log`)

        if (!fs.existsSync(logFilePath)) {
            throw new Error("File not found")
        }

        const fileContent = fs.readFileSync(logFilePath, "utf8")
        let lines = fileContent.split("\n").filter((line) => line.trim())

        // Apply filters
        if (options.search) {
            const searchTerm = options.search.toLowerCase()
            lines = lines.filter((line) => line.toLowerCase().includes(searchTerm))
        }

        if (options.level) {
            lines = lines.filter((line) => line.includes(`"level":"${options.level}"`))
        }

        if (options.startDate || options.endDate) {
            lines = lines.filter((line) => {
                try {
                    // Try to extract timestamp from log line
                    const match = line.match(/"timestamp":"([^"]+)"/)
                    if (match) {
                        const timestamp = match[1]
                        const logDate = new Date(timestamp)

                        if (options.startDate && logDate < new Date(options.startDate)) {
                            return false
                        }
                        if (options.endDate && logDate > new Date(options.endDate)) {
                            return false
                        }
                    }
                    return true
                } catch (e) {
                    return true
                }
            })
        }

        // const totalLines = lines.length
        // const page = options.page || 1
        // const limit = options.limit || 100
        // const startIndex = (page - 1) * limit
        // const endIndex = startIndex + limit

        // const paginatedLines = lines.slice(startIndex, endIndex)
        const content = lines.join("\n")

        return { content }
    } catch (error) {
        throw new Error(`Failed to read log file: ${error.message}`)
    }
}

/**
 * Get log file statistics
 * @param {string} logType - The log type
 * @param {string} fileName - The log file name
 * @returns {Promise<Object>} - Log file statistics
 */
async function getLogStats(logType, fileName) {
    try {
        if (!isValidLogType(logType)) {
            throw new Error("Invalid log type")
        }

        const logFilePath = path.join(BASE_LOG_DIR, logType, fileName)

        if (!fs.existsSync(logFilePath)) {
            throw new Error("File not found")
        }

        const stats = fs.statSync(logFilePath)
        const fileContent = fs.readFileSync(logFilePath, "utf8")
        const lines = fileContent.split("\n").filter((line) => line.trim())

        // Count log levels
        const levelCounts = {}
        lines.forEach((line) => {
            const match = line.match(/"level":"([^"]+)"/)
            if (match) {
                const level = match[1]
                levelCounts[level] = (levelCounts[level] || 0) + 1
            }
        })

        // Get date range
        let firstDate = null
        let lastDate = null
        lines.forEach((line) => {
            const match = line.match(/"timestamp":"([^"]+)"/)
            if (match) {
                const timestamp = match[1]
                const date = new Date(timestamp)
                if (!firstDate || date < firstDate) firstDate = date
                if (!lastDate || date > lastDate) lastDate = date
            }
        })

        return {
            fileName,
            fileSize: stats.size,
            totalLines: lines.length,
            levelCounts,
            firstDate: firstDate ? firstDate.toISOString() : null,
            lastDate: lastDate ? lastDate.toISOString() : null,
            lastModified: stats.mtime.toISOString(),
        }
    } catch (error) {
        throw new Error(`Failed to get log stats: ${error.message}`)
    }
}

/**
 * Clear log file content
 * @param {string} logType - The log type
 * @param {string} fileName - The log file name
 * @returns {Promise<void>}
 */
async function clearLogFile(logType, fileName) {
    try {
        if (!isValidLogType(logType)) {
            throw new Error("Invalid log type")
        }

        const logFilePath = path.join(BASE_LOG_DIR, logType, fileName)

        if (!fs.existsSync(logFilePath)) {
            throw new Error("File not found")
        }

        fs.writeFileSync(logFilePath, "")
    } catch (error) {
        throw new Error(`Failed to clear log file: ${error.message}`)
    }
}

/**
 * Search across multiple log files
 * @param {Array} logTypes - Array of log types to search
 * @param {string} searchTerm - Search term
 * @param {Object} options - Additional search options
 * @returns {Promise<Array>} - Search results
 */
async function searchLogs(logTypes, searchTerm, options = {}) {
    try {
        const results = []

        for (const logType of logTypes) {
            const files = await getLogFiles(logType)

            for (const fileName of files) {
                try {
                    const searchOptions = {
                        search: searchTerm,
                        level: options.level,
                        startDate: options.startDate,
                        endDate: options.endDate,
                        page: 1,
                        limit: 50,
                    }

                    const logData = await readLogFile(logType, fileName, searchOptions)

                    if (logData.content.trim()) {
                        results.push({
                            logType,
                            fileName,
                            matches: logData.totalLines,
                            preview: logData.content.split("\n").slice(0, 5).join("\n"),
                        })
                    }
                } catch (error) {
                    // Skip files that can't be read
                    continue
                }
            }
        }

        return results
    } catch (error) {
        throw new Error(`Failed to search logs: ${error.message}`)
    }
}

module.exports = {
    LOG_TYPES,
    isValidLogType,
    hasLogPermission,
    getLogFiles,
    readLogFile,
    getLogStats,
    clearLogFile,
    searchLogs,
}
