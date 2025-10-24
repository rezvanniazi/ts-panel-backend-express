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
 * /api/service-logs:
 *   get:
 *     tags: [Logs]
 *     summary: Get list of all service log files for all service types
 *     responses:
 *       200:
 *         description: Logs list
 */
router.get("/", async (req, res) => {
    try {
        const socketService = getSocketService()
        if (!socketService) {
            return res.status(500).json({
                error: "Socket service not available",
            })
        }

        const logger = socketService.getServiceLogger()
        const allLogs = logger.getAllServiceLogs()

        res.json({
            success: true,
            logs: allLogs,
        })
    } catch (error) {
        console.error("Error fetching all service logs:", error)
        res.status(500).json({
            error: "Failed to fetch service logs",
            message: error.message,
        })
    }
})

/**
 * @swagger
 * /api/service-logs/{serviceType}:
 *   get:
 *     tags: [Logs]
 *     summary: Get list of all log files for a specific service type
 *     parameters:
 *       - in: path
 *         name: serviceType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service type logs
 */
router.get("/:serviceType", async (req, res) => {
    try {
        const { serviceType } = req.params
        const limit = parseInt(req.query.limit) || 50

        const socketService = getSocketService()
        if (!socketService) {
            return res.status(500).json({
                error: "Socket service not available",
            })
        }

        const logger = socketService.getServiceLogger()
        const serviceLogs = logger.getServiceTypeLogs(serviceType, limit)

        res.json({
            success: true,
            serviceType,
            logs: serviceLogs,
            count: Object.keys(serviceLogs).length,
        })
    } catch (error) {
        console.error("Error fetching service type logs:", error)
        res.status(500).json({
            error: "Failed to fetch service type logs",
            message: error.message,
        })
    }
})

/**
 * @swagger
 * /api/service-logs/{serviceType}/{serviceId}:
 *   get:
 *     tags: [Logs]
 *     summary: Get logs for a specific service
 *     parameters:
 *       - in: path
 *         name: serviceType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logs
 */
router.get("/:serviceType/:serviceId", async (req, res) => {
    try {
        const { serviceType, serviceId } = req.params
        const limit = parseInt(req.query.limit) || 100

        const socketService = getSocketService()
        if (!socketService) {
            return res.status(500).json({
                error: "Socket service not available",
            })
        }

        const logger = socketService.getServiceLogger()
        const logs = logger.getServiceLogs(serviceType, serviceId, limit)

        res.json({
            success: true,
            serviceType,
            serviceId,
            logs,
            count: logs.length,
        })
    } catch (error) {
        console.error("Error fetching service logs:", error)
        res.status(500).json({
            error: "Failed to fetch service logs",
            message: error.message,
        })
    }
})

/**
 * @swagger
 * /api/service-logs/{serviceType}/{serviceId}:
 *   delete:
 *     tags: [Logs]
 *     summary: Clear logs for a specific service
 *     parameters:
 *       - in: path
 *         name: serviceType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logs cleared
 */
router.delete("/:serviceType/:serviceId", async (req, res) => {
    try {
        const { serviceType, serviceId } = req.params

        const socketService = getSocketService()
        if (!socketService) {
            return res.status(500).json({
                error: "Socket service not available",
            })
        }

        const logger = socketService.getServiceLogger()
        const success = logger.clearServiceLogs(serviceType, serviceId)

        res.json({
            success,
            serviceType,
            serviceId,
            message: success ? "Logs cleared successfully" : "Failed to clear logs",
        })
    } catch (error) {
        console.error("Error clearing service logs:", error)
        res.status(500).json({
            error: "Failed to clear service logs",
            message: error.message,
        })
    }
})

module.exports = router
