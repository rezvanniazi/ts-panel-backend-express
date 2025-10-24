const fs = require("fs")
const path = require("path")

/**
 * Generic Service Logger Utility
 * Handles logging for all service types: audioBot, managerBot, users, ranksystem, teamspeak, etc.
 */
class ServiceLogger {
    constructor(io) {
        this.io = io
        this.logDir = path.join(process.cwd(), "log")
        this.ensureLogDirectories()
    }

    /**
     * Ensures all log directories exist
     */
    ensureLogDirectories() {
        const serviceTypes = ["audioBot", "managerBot", "users", "ranksystem", "teamspeak", "server"]

        serviceTypes.forEach((serviceType) => {
            const serviceLogDir = path.join(this.logDir, serviceType)
            if (!fs.existsSync(serviceLogDir)) {
                fs.mkdirSync(serviceLogDir, { recursive: true })
            }
        })
    }

    /**
     * Formats timestamp for logging
     * @returns {string} Formatted timestamp
     */
    getTimestamp() {
        return new Date().toISOString()
    }

    /**
     * Logs service operation event to file and emits via socket
     * @param {string} serviceType - Type of service (audioBot, managerBot, users, ranksystem, teamspeak, server)
     * @param {string} operation - Operation being performed (create, update, delete, start, stop, etc.)
     * @param {object} serviceData - Service data
     * @param {string} serviceId - Unique service identifier
     * @param {string} status - Status of the operation (started, success, error, in_progress, etc.)
     * @param {string} message - Additional message
     * @param {object} additionalData - Any additional data to log
     */
    logServiceOperation(serviceType, operation, serviceData, serviceId, status, message, additionalData = {}) {
        const timestamp = this.getTimestamp()
        const logEntry = {
            timestamp,
            serviceType,
            operation,
            serviceId,
            status,
            message,
            serviceData,
            additionalData,
        }

        // Log to file
        this.logToFile(serviceType, serviceId, logEntry)

        // Emit via socket
        this.emitToSocket(serviceType, serviceId, logEntry)
    }

    /**
     * Logs to file
     * @param {string} serviceType - Service type
     * @param {string} serviceId - Service identifier
     * @param {object} logEntry - Log entry object
     */
    logToFile(serviceType, serviceId, logEntry) {
        try {
            const serviceLogDir = path.join(this.logDir, serviceType)
            const logFilePath = path.join(serviceLogDir, `${serviceId}.log`)
            const logLine = JSON.stringify(logEntry) + "\n"

            fs.appendFileSync(logFilePath, logLine)
            console.log(`📝 Logged to file: ${logFilePath}`)
        } catch (error) {
            console.error(`❌ Failed to write to log file: ${error.message}`)
        }
    }

    /**
     * Emits log entry via socket
     * @param {string} serviceType - Service type
     * @param {string} serviceId - Service identifier
     * @param {object} logEntry - Log entry object
     */
    emitToSocket(serviceType, serviceId, logEntry) {
        try {
            if (this.io) {
                // Emit to all connected clients
                this.io.emit("serviceOperationLog", {
                    serviceType,
                    serviceId,
                    ...logEntry,
                })

                // Emit to specific service room
                this.io.to(`${serviceType}-${serviceId}`).emit("serviceOperationUpdate", {
                    serviceType,
                    serviceId,
                    ...logEntry,
                })

                // Emit to service type room
                this.io.to(`service-${serviceType}`).emit("serviceTypeUpdate", {
                    serviceType,
                    serviceId,
                    ...logEntry,
                })

                console.log(`📡 Emitted log via socket for ${serviceType}: ${serviceId}`)
            }
        } catch (error) {
            console.error(`❌ Failed to emit via socket: ${error.message}`)
        }
    }

    /**
     * Logs service operation start
     * @param {string} serviceType - Service type
     * @param {string} operation - Operation being performed
     * @param {object} serviceData - Service data
     * @param {string} serviceId - Service identifier
     */
    logOperationStart(serviceType, operation, serviceData, serviceId) {
        this.logServiceOperation(
            serviceType,
            operation,
            serviceData,
            serviceId,
            "started",
            `${serviceType} ${operation} process started`,
            { step: "initialization" }
        )
    }

    /**
     * Logs service operation step
     * @param {string} serviceType - Service type
     * @param {string} serviceId - Service identifier
     * @param {string} step - Current step
     * @param {string} message - Step message
     * @param {object} stepData - Additional step data
     */
    logOperationStep(serviceType, serviceId, step, message, stepData = {}) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            serviceType,
            serviceId,
            status: "in_progress",
            message,
            step,
            stepData,
        }

        this.logToFile(serviceType, serviceId, logEntry)
        this.emitToSocket(serviceType, serviceId, logEntry)
    }

    /**
     * Logs service operation success
     * @param {string} serviceType - Service type
     * @param {string} operation - Operation performed
     * @param {object} serviceData - Service data
     * @param {string} serviceId - Service identifier
     * @param {object} result - Operation result
     */
    logOperationSuccess(serviceType, operation, serviceData, serviceId, result) {
        this.logServiceOperation(
            serviceType,
            operation,
            serviceData,
            serviceId,
            "success",
            `${serviceType} ${operation} completed successfully`,
            { result }
        )
    }

    /**
     * Logs service operation error
     * @param {string} serviceType - Service type
     * @param {string} operation - Operation being performed
     * @param {object} serviceData - Service data
     * @param {string} serviceId - Service identifier
     * @param {Error} error - Error object
     * @param {string} step - Step where error occurred
     */
    logOperationError(serviceType, operation, serviceData, serviceId, error, step = "unknown") {
        this.logServiceOperation(
            serviceType,
            operation,
            serviceData,
            serviceId,
            "error",
            `${serviceType} ${operation} failed: ${error.message}`,
            {
                error: error.message,
                stack: error.stack,
                step,
            }
        )
    }

    /**
     * Gets log entries for a specific service
     * @param {string} serviceType - Service type
     * @param {string} serviceId - Service identifier
     * @param {number} limit - Number of entries to return (default: 100)
     * @returns {Array} Array of log entries
     */
    getServiceLogs(serviceType, serviceId, limit = 100) {
        try {
            const serviceLogDir = path.join(this.logDir, serviceType)
            const logFilePath = path.join(serviceLogDir, `${serviceId}.log`)

            if (!fs.existsSync(logFilePath)) {
                return []
            }

            const logContent = fs.readFileSync(logFilePath, "utf8")
            const lines = logContent
                .trim()
                .split("\n")
                .filter((line) => line.trim())

            // Parse JSON lines and limit results
            const logs = lines
                .map((line) => {
                    try {
                        return JSON.parse(line)
                    } catch (e) {
                        return null
                    }
                })
                .filter((log) => log !== null)
                .slice(-limit)

            return logs
        } catch (error) {
            console.error(`❌ Failed to read ${serviceType} logs: ${error.message}`)
            return []
        }
    }

    /**
     * Gets all logs for a service type
     * @param {string} serviceType - Service type
     * @param {number} limit - Number of entries per service (default: 50)
     * @returns {object} Object with service IDs as keys and log arrays as values
     */
    getServiceTypeLogs(serviceType, limit = 50) {
        try {
            const serviceLogDir = path.join(this.logDir, serviceType)

            if (!fs.existsSync(serviceLogDir)) {
                return {}
            }

            const files = fs.readdirSync(serviceLogDir)
            const serviceLogs = {}

            files
                .filter((file) => file.endsWith(".log"))
                .forEach((file) => {
                    const serviceId = file.replace(".log", "")
                    serviceLogs[serviceId] = this.getServiceLogs(serviceType, serviceId, limit)
                })

            return serviceLogs
        } catch (error) {
            console.error(`❌ Failed to read ${serviceType} logs: ${error.message}`)
            return {}
        }
    }

    /**
     * Clears logs for a specific service
     * @param {string} serviceType - Service type
     * @param {string} serviceId - Service identifier
     * @returns {boolean} Success status
     */
    clearServiceLogs(serviceType, serviceId) {
        try {
            const serviceLogDir = path.join(this.logDir, serviceType)
            const logFilePath = path.join(serviceLogDir, `${serviceId}.log`)

            if (fs.existsSync(logFilePath)) {
                fs.unlinkSync(logFilePath)
                console.log(`🗑️  Cleared logs for ${serviceType}: ${serviceId}`)
            }

            return true
        } catch (error) {
            console.error(`❌ Failed to clear ${serviceType} logs: ${error.message}`)
            return false
        }
    }

    /**
     * Gets list of all service log files
     * @returns {object} Object with service types as keys and file lists as values
     */
    getAllServiceLogs() {
        try {
            const serviceTypes = ["audioBot", "managerBot", "users", "ranksystem", "teamspeak", "server"]
            const allLogs = {}

            serviceTypes.forEach((serviceType) => {
                const serviceLogDir = path.join(this.logDir, serviceType)

                if (!fs.existsSync(serviceLogDir)) {
                    allLogs[serviceType] = []
                    return
                }

                const files = fs.readdirSync(serviceLogDir)
                allLogs[serviceType] = files
                    .filter((file) => file.endsWith(".log"))
                    .map((file) => {
                        const serviceId = file.replace(".log", "")
                        const filePath = path.join(serviceLogDir, file)
                        const stats = fs.statSync(filePath)

                        return {
                            serviceId,
                            fileName: file,
                            size: stats.size,
                            created: stats.birthtime,
                            modified: stats.mtime,
                        }
                    })
            })

            return allLogs
        } catch (error) {
            console.error(`❌ Failed to read all service logs: ${error.message}`)
            return {}
        }
    }
}

module.exports = ServiceLogger
