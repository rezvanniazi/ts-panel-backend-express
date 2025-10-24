const express = require("express")
const router = express.Router()
const { getLogTypes, getLogFiles, readLogFile, getLogStats, clearLogFile, searchLogs } = require("../handlers/api/logs")

// Get list of available log types
router.get("/types", getLogTypes)

// Get list of log files for a specific type
router.get("/:logType/files", getLogFiles)

// Read specific log file content
router.get("/:logType/files/:fileName", readLogFile)

// Get log file statistics
router.get("/:logType/files/:fileName/stats", getLogStats)

// Clear log file content (admin only)
router.delete("/:logType/files/:fileName", clearLogFile)

// Search across multiple log files
router.post("/search", searchLogs)

module.exports = router
