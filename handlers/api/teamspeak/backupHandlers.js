const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")

const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const { createSnapshot, deploySnapshot } = require("../../../lib/teamspeak/teamspeakQuery")
const deleteSnapshot = require("../../../lib/utils/deleteSnapshot")
const getSnapshotList = require("../../../lib/utils/getSnapshotList")
const Servers = require("../../../models/Servers")

exports.create = async (req, res) => {
    const { username, scope } = req.user
    const { serverId } = req.body

    const server = await Servers.findByPk(serverId)
    if (!server || server.state == "suspended") {
        return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_FOUND)
    }
    if (scope == "reseller" && server.author !== username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    const snapshotList = await getSnapshotList(server.server_port, server.query_port)

    if (snapshotList.length >= 5) {
        return res.status(apiCodes.SNAPSHOT_LIMIT).json(responses.TEAMSPEAK.SNAPSHOT.FIVE_SNAPSHOT)
    }

    await createSnapshot(server.server_port, server.query_port, server.query_password)

    return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.SNAPSHOT.CREATED)
}

exports.deployBackup = async (req, res) => {
    const { username, scope } = req.user
    const { serverId, snapshotName } = req.body

    const server = await Servers.findByPk(serverId)
    if (!server || server.state == "suspended") {
        return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_FOUND)
    }
    if (scope == "reseller" && server.author !== username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    await deploySnapshot(snapshotName, server.server_port, server.query_port, server.query_password)
    try {
        await teamspeakHelper.stop(server)
        await teamspeakHelper.start(server)
    } catch (err) {
        console.error(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }

    return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.SNAPSHOT.DEPLOYED)
}

exports.deleteBackup = async (req, res) => {
    const { username, scope } = req.user
    const { serverId, snapshotName } = req.body

    const server = await Servers.findByPk(serverId)

    if (!server || server.state == "suspended") {
        return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
    }
    if (scope == "reseller" && server.author !== username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    await deleteSnapshot(server, snapshotName)

    return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.SNAPSHOT.DELETED)
}

exports.getBackupList = async (req, res) => {
    const { username, scope } = req.user
    const { serverId } = req.body

    const server = await Servers.findByPk(serverId)
    if (!server || server.state == "suspended") {
        return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_FOUND)
    }
    if (scope == "reseller" && server.author !== username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    const backupList = await getSnapshotList(server.server_port, server.query_port)
    return res.status(apiCodes.SUCCESS).json(backupList)
}
