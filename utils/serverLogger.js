const fs = require("fs")
const path = require("path")

/**
 * Server Logger Utility
 * Handles logging server creation events to files and emitting via socket
 */
class ServerLogger {
    constructor(io) {
        this.io = io
        this.logDir = path.join(process.cwd(), "log", "server")
        this.ensureLogDirectory()
    }

    /**
     * Ensures the log directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true })
        }
    }

    /**
     * Formats timestamp for logging
     * @returns {string} Formatted timestamp
     */
    getTimestamp() {
        return new Date().toISOString()
    }

    /**
     * Logs server creation event to file and emits via socket
     * @param {object} serverData - Server creation data
     * @param {string} serverId - Unique server identifier
     * @param {string} status - Status of the operation (success, error, etc.)
     * @param {string} message - Additional message
     * @param {object} additionalData - Any additional data to log
     */
    logServerCreation(serverData, serverId, status, message, additionalData = {}) {
        const timestamp = this.getTimestamp()
        const logEntry = {
            timestamp,
            serverId,
            status,
            message,
            serverData,
            additionalData,
        }

        // Log to file
        this.logToFile(serverId, logEntry)

        // Emit via socket
        this.emitToSocket(serverId, logEntry)
    }

    /**
     * Logs to file
     * @param {string} serverId - Server identifier
     * @param {object} logEntry - Log entry object
     */
    logToFile(serverId, logEntry) {
        try {
            const logFilePath = path.join(this.logDir, `${serverId}.log`)
            const logLine = JSON.stringify(logEntry) + "\n"

            fs.appendFileSync(logFilePath, logLine)
            console.log(`📝 Logged to file: ${logFilePath}`)
        } catch (error) {
            console.error(`❌ Failed to write to log file: ${error.message}`)
        }
    }

    /**
     * Emits log entry via socket
     * @param {string} serverId - Server identifier
     * @param {object} logEntry - Log entry object
     */
    emitToSocket(serverId, logEntry) {
        try {
            if (this.io) {
                // Emit to all connected clients
                this.io.emit("serverCreationLog", {
                    serverId,
                    ...logEntry,
                })

                // Emit to specific room for this server
                this.io.to(`server-${serverId}`).emit("serverCreationUpdate", {
                    serverId,
                    ...logEntry,
                })

                console.log(`📡 Emitted log via socket for server: ${serverId}`)
            }
        } catch (error) {
            console.error(`❌ Failed to emit via socket: ${error.message}`)
        }
    }

    /**
     * Logs server creation start
     * @param {object} serverData - Server creation parameters
     * @param {string} serverId - Server identifier
     */
    logCreationStart(serverData, serverId) {
        this.logServerCreation(serverData, serverId, "started", "Server creation process started", {
            step: "initialization",
        })
    }

    /**
     * Logs server creation step
     * @param {string} serverId - Server identifier
     * @param {string} step - Current step
     * @param {string} message - Step message
     * @param {object} stepData - Additional step data
     */
    logCreationStep(serverId, step, message, stepData = {}) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            serverId,
            status: "in_progress",
            message,
            step,
            stepData,
        }

        this.logToFile(serverId, logEntry)
        this.emitToSocket(serverId, logEntry)
    }

    /**
     * Logs server creation success
     * @param {object} serverData - Server creation parameters
     * @param {string} serverId - Server identifier
     * @param {object} result - Creation result
     */
    logCreationSuccess(serverData, serverId, result) {
        this.logServerCreation(serverData, serverId, "success", "Server created successfully", { result })
    }

    /**
     * Logs server creation error
     * @param {object} serverData - Server creation parameters
     * @param {string} serverId - Server identifier
     * @param {Error} error - Error object
     * @param {string} step - Step where error occurred
     */
    logCreationError(serverData, serverId, error, step = "unknown") {
        this.logServerCreation(serverData, serverId, "error", `Server creation failed: ${error.message}`, {
            error: error.message,
            stack: error.stack,
            step,
        })
    }

    /**
     * Gets log entries for a specific server
     * @param {string} serverId - Server identifier
     * @param {number} limit - Number of entries to return (default: 100)
     * @returns {Array} Array of log entries
     */
    getServerLogs(serverId, limit = 100) {
        try {
            const logFilePath = path.join(this.logDir, `${serverId}.log`)

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
            console.error(`❌ Failed to read server logs: ${error.message}`)
            return []
        }
    }

    /**
     * Clears logs for a specific server
     * @param {string} serverId - Server identifier
     * @returns {boolean} Success status
     */
    clearServerLogs(serverId) {
        try {
            const logFilePath = path.join(this.logDir, `${serverId}.log`)

            if (fs.existsSync(logFilePath)) {
                fs.unlinkSync(logFilePath)
                console.log(`🗑️  Cleared logs for server: ${serverId}`)
            }

            return true
        } catch (error) {
            console.error(`❌ Failed to clear server logs: ${error.message}`)
            return false
        }
    }
}

module.exports = ServerLogger
