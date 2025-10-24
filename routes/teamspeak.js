const express = require("express")
const router = express.Router()
const validate = require("../middleware/validate")
const schema = require("../schema/teamspeak")

const handlers = {
    activate: require("../handlers/api/teamspeak/activateServer"),
    create: require("../handlers/api/teamspeak/createServer"),
    delete: require("../handlers/api/teamspeak/deleteServer"),
    edit: require("../handlers/api/teamspeak/editServer"),
    extend: require("../handlers/api/teamspeak/extendServer"),
    getServer: require("../handlers/api/teamspeak/getServer"),
    getServerList: require("../handlers/api/teamspeak/getServerList"),
    getUsedPorts: require("../handlers/api/teamspeak/getUsedPorts"),
    restartServer: require("../handlers/api/teamspeak/restartServer"),
    restartServerBulk: require("../handlers/api/teamspeak/restartServerBulk"),
    startServer: require("../handlers/api/teamspeak/startServer"),
    startServerBulk: require("../handlers/api/teamspeak/startServerBulk"),
    stopServer: require("../handlers/api/teamspeak/stopServer"),
    stopServerBulk: require("../handlers/api/teamspeak/stopServerBulk"),
    suspendServer: require("../handlers/api/teamspeak/suspendServer"),
    snapshot: {
        create: require("../handlers/api/teamspeak/backupHandlers").create,
        deploy: require("../handlers/api/teamspeak/backupHandlers").deployBackup,
        delete: require("../handlers/api/teamspeak/backupHandlers").deleteBackup,
        getAll: require("../handlers/api/teamspeak/backupHandlers").getBackupList,
    },
    query: require("../handlers/api/teamspeak/teamspeakQuery"),
}

router.post("/activate", validate(schema.activate), handlers.activate)

router.post("/create", validate(schema.create), handlers.create)

router.post("/edit", validate(schema.editServer), handlers.edit)

router.delete("/delete", validate(schema.delete), handlers.delete)

router.post("/extend", validate(schema.extendServer), handlers.extend)

router.get("/get-server", handlers.getServer)

router.get("/get-server-list", handlers.getServerList)

router.get("/get-used-ports", handlers.getUsedPorts)

router.post("/restart", validate(schema.restartServer), handlers.restartServer)

router.post("/restart-bulk", validate(schema.restartServerBulk), handlers.restartServerBulk)

router.post("/start", validate(schema.startServer), handlers.startServer)

router.post("/start-bulk", validate(schema.startServerBulk), handlers.startServerBulk)

router.post("/stop", validate(schema.stopServer), handlers.stopServer)

router.post("/stop-bulk", validate(schema.stopServerBulk), handlers.stopServerBulk)

router.post("/suspend", validate(schema.suspendServer), handlers.suspendServer)

router.post("/snapshot/create", validate(schema.snapshot.create), handlers.snapshot.create)
router.post("/snapshot/deploy", validate(schema.snapshot.deploy), handlers.snapshot.deploy)
router.delete("/snapshot/delete", validate(schema.snapshot.delete), handlers.snapshot.delete)
router.post("/snapshot/getall", validate(schema.snapshot.getAll), handlers.snapshot.getAll)

router.post("/query/get-servergroup-list", validate(schema.query.getServerGroupList), handlers.query.getServergroupList)
router.post("/query/get-online-list", validate(schema.query.getOnlineList), handlers.query.getOnlineList)
router.post("/query/get-ban-list", validate(schema.query.getBanList), handlers.query.getBanList)

router.post("/query/add-servergroup", validate(schema.query.serverGroupAdd), handlers.query.serverGroupAdd)
router.post("/query/del-servergroup", validate(schema.query.serverGroupDel), handlers.query.serverGroupDel)
router.post("/query/ban-client", validate(schema.query.banClient), handlers.query.banClient)
router.post("/query/unban-client", validate(schema.query.unbanClient), handlers.query.unbanClient)

router.post("/query/kick-client", validate(schema.query.kickClient), handlers.query.kickClient)

module.exports = router
