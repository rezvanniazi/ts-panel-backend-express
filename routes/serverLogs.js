const express = require("express")
const router = express.Router()
const { getSocketService } = require("../services/socket/socketController")

/**
 * @swagger
 * tags:
 *   - name: Logs
 *     description: Service and server logs
 */

/**
 * @swagger
 * /api/server-logs/{serverId}:
 *   get:
 *     tags: [Logs]
 *     summary: Get logs for a specific server
 *     parameters:
 *       - in: path
 *         name: serverId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Server logs
 */
router.get("/:serverId", async (req, res) => {
    try {
        const { serverId } = req.params
        const limit = parseInt(req.query.limit) || 100

        const socketService = getSocketService()
        if (!socketService) {
            return res.status(500).json({
                error: "Socket service not available",
            })
        }

        const logger = socketService.getServerLogger()
        const logs = logger.getServerLogs(serverId, limit)

        res.json({
            success: true,
            serverId,
            logs,
            count: logs.length,
        })
    } catch (error) {
        console.error("Error fetching server logs:", error)
        res.status(500).json({
            error: "Failed to fetch server logs",
            message: error.message,
        })
    }
})

/**
 * @swagger
 * /api/server-logs/{serverId}:
 *   delete:
 *     tags: [Logs]
 *     summary: Clear logs for a specific server
 *     parameters:
 *       - in: path
 *         name: serverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logs cleared
 */
router.delete("/:serverId", async (req, res) => {
    try {
        const { serverId } = req.params

        const socketService = getSocketService()
        if (!socketService) {
            return res.status(500).json({
                error: "Socket service not available",
            })
        }

        const logger = socketService.getServerLogger()
        const success = logger.clearServerLogs(serverId)

        res.json({
            success,
            serverId,
            message: success ? "Logs cleared successfully" : "Failed to clear logs",
        })
    } catch (error) {
        console.error("Error clearing server logs:", error)
        res.status(500).json({
            error: "Failed to clear server logs",
            message: error.message,
        })
    }
})

/**
 * @swagger
 * /api/server-logs:
 *   get:
 *     tags: [Logs]
 *     summary: Get list of all server log files
 *     responses:
 *       200:
 *         description: Server log file list
 */
router.get("/", async (req, res) => {
    try {
        const socketService = getSocketService()
        if (!socketService) {
            return res.status(500).json({
                error: "Socket service not available",
            })
        }

        const logger = socketService.getServerLogger()
        const fs = require("fs")
        const path = require("path")

        const logDir = path.join(process.cwd(), "log", "server")

        if (!fs.existsSync(logDir)) {
            return res.json({
                success: true,
                servers: [],
            })
        }

        const files = fs.readdirSync(logDir)
        const serverLogs = files
            .filter((file) => file.endsWith(".log"))
            .map((file) => {
                const serverId = file.replace(".log", "")
                const filePath = path.join(logDir, file)
                const stats = fs.statSync(filePath)

                return {
                    serverId,
                    fileName: file,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                }
            })

        res.json({
            success: true,
            servers: serverLogs,
            count: serverLogs.length,
        })
    } catch (error) {
        console.error("Error fetching server log list:", error)
        res.status(500).json({
            error: "Failed to fetch server log list",
            message: error.message,
        })
    }
})

module.exports = router
