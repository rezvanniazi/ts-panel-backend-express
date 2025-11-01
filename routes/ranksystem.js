const express = require("express")
const router = express.Router()
const validate = require("../middleware/validate")
const schema = require("../schema/ranksystem")

const handlers = {
    activate: require("../handlers/api/ranksystem/activateBot"),
    connect: require("../handlers/api/ranksystem/connectBot"),
    connectBulk: require("../handlers/api/ranksystem/connectBulk"),
    create: require("../handlers/api/ranksystem/createBot"),
    delete: require("../handlers/api/ranksystem/deleteBot"),
    disconnect: require("../handlers/api/ranksystem/disconnectBot"),
    disconnectBulk: require("../handlers/api/ranksystem/disconnectBulk"),
    edit: require("../handlers/api/ranksystem/editBot"),
    extend: require("../handlers/api/ranksystem/extendBot"),
    getBotInfo: require("../handlers/api/ranksystem/getBotInfo"),
    getBotList: require("../handlers/api/ranksystem/getBotList"),
    reconnect: require("../handlers/api/ranksystem/reconnectBot"),
    reconnectBulk: require("../handlers/api/ranksystem/reconnectBulk"),
    suspend: require("../handlers/api/ranksystem/suspendBot"),
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
router.post("/get-bot-info", validate(schema.getBotInfo), handlers.getBotInfo)
router.get("/get-bot-list", handlers.getBotList)
router.post("/reconnect", validate(schema.reconnect), handlers.reconnect)
router.post("/reconnect-bulk", validate(schema.reconnectBulk), handlers.reconnectBulk)
router.post("/suspend", validate(schema.suspend), handlers.suspend)

module.exports = router
