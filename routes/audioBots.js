const express = require("express")
const router = express.Router()
const validate = require("../middleware/validate")
const schema = require("../schema/audioBot")

const handlers = {
    activate: require("../handlers/api/audioBot/activateBot"),
    changeBotPlaying: require("../handlers/api/audioBot/changeBotPlaying"),
    changeVolume: require("../handlers/api/audioBot/changeVolume"),

    connect: require("../handlers/api/audioBot/connectBot"),
    connectBulk: require("../handlers/api/audioBot/connectBulk"),
    createBot: require("../handlers/api/audioBot/createBot"),
    deleteBot: require("../handlers/api/audioBot/deleteBot"),
    disconnectBot: require("../handlers/api/audioBot/disconnectBot"),
    disconnectBulk: require("../handlers/api/audioBot/disconnectBulk"),
    editBot: require("../handlers/api/audioBot/editBot"),
    extendBot: require("../handlers/api/audioBot/extendBot"),
    getBotInfo: require("../handlers/api/audioBot/getBotInfo"),
    getBotList: require("../handlers/api/audioBot/getBotList"),
    reconnect: require("../handlers/api/audioBot/reconnectBot"),
    reconnectBulk: require("../handlers/api/audioBot/reconnectBulk"),
    suspendBot: require("../handlers/api/audioBot/suspendBot"),
}

router.post("/activate", validate(schema.activate), handlers.activate)

router.post("/change-playing", validate(schema.changeBotPlaying), handlers.changeBotPlaying)

router.post("/change-volume", validate(schema.changeVolume), handlers.changeVolume)

router.post("/create", validate(schema.create), handlers.createBot)

router.post("/edit", validate(schema.editBot), handlers.editBot)

router.delete("/delete", validate(schema.delete), handlers.deleteBot)

router.post("/extend", validate(schema.extendBot), handlers.extendBot)

router.get("/get-bot/:botId", handlers.getBotInfo)

router.get("/get-bot-list", handlers.getBotList)

router.post("/reconnect", validate(schema.reconnectBot), handlers.reconnect)

router.post("/reconnect-bulk", validate(schema.reconnectBulk), handlers.reconnectBulk)

router.post("/connect", validate(schema.connectBot), handlers.connect)

router.post("/connect-bulk", validate(schema.connectBulk), handlers.connectBulk)

router.post("/disconnect", validate(schema.disconnectBot), handlers.disconnectBot)

router.post("/disconnect-bulk", validate(schema.disconnectBulk), handlers.disconnectBulk)

router.post("/suspend", validate(schema.suspendBot), handlers.suspendBot)

module.exports = router
