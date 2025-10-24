const logHelper = require("../../../lib/utils/logHelper")
const responses = require("../../../constants/responses")
const apiCodes = require("../../../constants/apiCodes")
const { createLogger } = require("../../../utils/logger")

/**
 * Get list of available log types and files
 */
const getLogTypes = async (req, res) => {
    const userLogger = createLogger("user", req.user.id)

    try {
        const logTypes = Object.keys(logHelper.LOG_TYPES).map((key) => ({
            key: logHelper.LOG_TYPES[key],
            name: key.toLowerCase(),
        }))

        userLogger.info(`User ${req.user.username} requested log types list`)

        return res.status(apiCodes.SUCCESS).json({
            ...responses.LOGS.LOGS_FETCHED,
            data: { logTypes },
        })
    } catch (error) {
        userLogger.error(`Error getting log types: ${error.message}`)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

/**
 * Get list of log files for a specific type
 */
const getLogFiles = async (req, res) => {
    const { logType } = req.params
    const userLogger = createLogger("user", req.user.id)

    try {
        // Validate log type
        if (!logHelper.isValidLogType(logType)) {
            userLogger.warn(`Invalid log type requested: ${logType}`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.LOGS.INVALID_LOG_TYPE)
        }

        // Check permissions
        if (!logHelper.hasLogPermission(req.user, logType)) {
            userLogger.warn(`User ${req.user.username} denied access to log type: ${logType}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.LOGS.ACCESS_DENIED)
        }

        const files = await logHelper.getLogFiles(logType)

        userLogger.info(`User ${req.user.username} requested files for log type: ${logType}`)

        return res.status(apiCodes.SUCCESS).json({
            ...responses.LOGS.LOGS_FETCHED,
            data: {
                logType,
                files: files.map((file) => ({
                    name: file,
                    type: "log",
                })),
            },
        })
    } catch (error) {
        userLogger.error(`Error getting log files for ${logType}: ${error.message}`)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

/**
 * Read specific log file content
 */
const readLogFile = async (req, res) => {
    const { logType, fileName } = req.params
    const { search, level, startDate, endDate, page, limit } = req.query
    const userLogger = createLogger("user", req.user.id)

    try {
        // Validate log type
        if (!logHelper.isValidLogType(logType)) {
            userLogger.warn(`Invalid log type requested: ${logType}`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.LOGS.INVALID_LOG_TYPE)
        }

        // Check permissions
        if (!logHelper.hasLogPermission(req.user, logType)) {
            userLogger.warn(`User ${req.user.username} denied access to log type: ${logType}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.LOGS.ACCESS_DENIED)
        }

        const options = {
            search,
            level,
            startDate,
            endDate,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 100,
        }

        const logData = await logHelper.readLogFile(logType, fileName, options)

        userLogger.info(`User ${req.user.username} read log file: ${logType}/${fileName}`)

        return res.status(apiCodes.SUCCESS).json({
            ...responses.LOGS.LOGS_FETCHED,
            data: logData,
        })
    } catch (error) {
        if (error.message === "File not found") {
            userLogger.warn(`Log file not found: ${logType}/${fileName}`)
            return res.status(apiCodes.NOT_FOUND).json(responses.LOGS.NOT_FOUND)
        }

        userLogger.error(`Error reading log file ${logType}/${fileName}: ${error.message}`)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

/**
 * Get log file statistics
 */
const getLogStats = async (req, res) => {
    const { logType, fileName } = req.params
    const userLogger = createLogger("user", req.user.id)

    try {
        // Validate log type
        if (!logHelper.isValidLogType(logType)) {
            userLogger.warn(`Invalid log type requested: ${logType}`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.LOGS.INVALID_LOG_TYPE)
        }

        // Check permissions
        if (!logHelper.hasLogPermission(req.user, logType)) {
            userLogger.warn(`User ${req.user.username} denied access to log type: ${logType}`)
            return res.status(apiCodes.FORBIDDEN).json(responses.LOGS.ACCESS_DENIED)
        }

        const stats = await logHelper.getLogStats(logType, fileName)

        userLogger.info(`User ${req.user.username} requested stats for: ${logType}/${fileName}`)

        return res.status(apiCodes.SUCCESS).json({
            ...responses.LOGS.LOGS_FETCHED,
            data: stats,
        })
    } catch (error) {
        if (error.message === "File not found") {
            userLogger.warn(`Log file not found: ${logType}/${fileName}`)
            return res.status(apiCodes.NOT_FOUND).json(responses.LOGS.NOT_FOUND)
        }

        userLogger.error(`Error getting log stats for ${logType}/${fileName}: ${error.message}`)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

/**
 * Clear log file content
 */
const clearLogFile = async (req, res) => {
    const { logType, fileName } = req.params
    const userLogger = createLogger("user", req.user.id)

    try {
        // Only admin can clear logs
        if (req.user.scope !== "admin") {
            userLogger.warn(`User ${req.user.username} attempted to clear log without admin permission`)
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        // Validate log type
        if (!logHelper.isValidLogType(logType)) {
            userLogger.warn(`Invalid log type requested: ${logType}`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.LOGS.INVALID_LOG_TYPE)
        }

        await logHelper.clearLogFile(logType, fileName)

        userLogger.info(`Admin ${req.user.username} cleared log file: ${logType}/${fileName}`)

        return res.status(apiCodes.SUCCESS).json(responses.LOGS.LOG_CLEARED)
    } catch (error) {
        if (error.message === "File not found") {
            userLogger.warn(`Log file not found: ${logType}/${fileName}`)
            return res.status(apiCodes.NOT_FOUND).json(responses.LOGS.NOT_FOUND)
        }

        userLogger.error(`Error clearing log file ${logType}/${fileName}: ${error.message}`)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

/**
 * Search across multiple log files
 */
const searchLogs = async (req, res) => {
    const { logTypes, search, level, startDate, endDate, page, limit } = req.body
    const userLogger = createLogger("user", req.user.id)

    try {
        if (!search || search.trim().length < 2) {
            return res.status(apiCodes.BAD_REQUEST).json({
                code: "INVALID_SEARCH",
                success: false,
                en: "Search term must be at least 2 characters",
                fa: "عبارت جستجو باید حداقل 2 کاراکتر باشد",
            })
        }

        const searchResults = []
        const typesToSearch = logTypes || Object.values(logHelper.LOG_TYPES)

        for (const logType of typesToSearch) {
            // Check permissions for each log type
            if (!logHelper.hasLogPermission(req.user, logType)) {
                continue
            }

            const files = await logHelper.getLogFiles(logType)

            for (const fileName of files) {
                try {
                    const options = {
                        search,
                        level,
                        startDate,
                        endDate,
                        page: 1,
                        limit: 50, // Limit per file for search
                    }

                    const logData = await logHelper.readLogFile(logType, fileName, options)

                    if (logData.content.trim()) {
                        searchResults.push({
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

        userLogger.info(`User ${req.user.username} searched logs with term: ${search}`)

        return res.status(apiCodes.SUCCESS).json({
            ...responses.LOGS.LOGS_FETCHED,
            data: {
                searchTerm: search,
                totalResults: searchResults.length,
                results: searchResults,
            },
        })
    } catch (error) {
        userLogger.error(`Error searching logs: ${error.message}`)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

module.exports = {
    getLogTypes,
    getLogFiles,
    readLogFile,
    getLogStats,
    clearLogFile,
    searchLogs,
}
