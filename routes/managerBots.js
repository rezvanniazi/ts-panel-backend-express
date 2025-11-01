const express = require("express")
const router = express.Router()
const validate = require("../middleware/validate")
const schema = require("../schema/managerBot")

const handlers = {
    activate: require("../handlers/api/managerBot/activateBot"),
    connect: require("../handlers/api/managerBot/connectBot"),
    connectBulk: require("../handlers/api/managerBot/connectBulk"),
    create: require("../handlers/api/managerBot/createBot"),
    delete: require("../handlers/api/managerBot/deleteBot"),
    disconnect: require("../handlers/api/managerBot/disconnectBot"),
    disconnectBulk: require("../handlers/api/managerBot/disconnectBulk"),
    edit: require("../handlers/api/managerBot/editBot"),
    extend: require("../handlers/api/managerBot/extendBot"),
    getBotList: require("../handlers/api/managerBot/getBotList"),
    reconnect: require("../handlers/api/managerBot/reconnectBot"),
    reconnectBulk: require("../handlers/api/managerBot/reconnectBulk"),
    suspend: require("../handlers/api/managerBot/suspendBot"),
    fetchConnectionData: require("../handlers/api/managerBot/fetchConnectionData"),
    toggleAutoRenew: require("../handlers/api/managerBot/toggleAutoRenew"),
}

router.post("/activate", validate(schema.activate), handlers.activate)
router.post("/connect", validate(schema.connect), handlers.connect)
router.post("/connect-bulk", validate(schema.connectBulk), handlers.connectBulk)
router.post("/create", validate(schema.create), handlers.create)
router.delete("/delete", validate(schema.delete), handlers.delete)
router.post("/disconnect", validate(schema.disconnect), handlers.disconnect)
router.post("/disconnect-bulk", validate(schema.disconnectBulk), handlers.disconnectBulk)
router.post("/edit", validate(schema.edit), handlers.edit)
router.post("/extend", validate(schema.extend), handlers.extend)
router.post("/reconnect", validate(schema.reconnect), handlers.reconnect)
router.post("/reconnect-bulk", validate(schema.reconnectBulk), handlers.reconnectBulk)
router.post("/suspend", validate(schema.suspend), handlers.suspend)
router.post("/fetch-connection-data", validate(schema.fetchConnectionData), handlers.fetchConnectionData)
router.post("/toggle-autorenew", validate(schema.toggleAutoRenew), handlers.toggleAutoRenew)

router.get("/get-bot-list", handlers.getBotList)

module.exports = router
