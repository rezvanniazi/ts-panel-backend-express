const { Raw } = require("teamspeak-query")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const teamspeakQuery = require("../../../lib/teamspeak/teamspeakQuery")
const Servers = require("../../../models/Servers")

function transformTeamspeakResponse(response) {
    // If response is already an array, return it directly
    if (Array.isArray(response)) {
        return response
    }

    // Handle single object case
    const propertyKeys = Object.keys(response).filter((key) => key !== "raw")

    // Check if this is an array-like response (some properties are arrays)
    const isArrayLike = propertyKeys.some((key) => Array.isArray(response[key]))

    if (!isArrayLike) {
        // Single object - wrap in array for consistency
        return [response]
    }

    // Handle array-like response (original transformation logic)
    const firstArrayKey = propertyKeys.find((key) => Array.isArray(response[key]))
    const objectCount = response[firstArrayKey].length
    const result = []

    for (let i = 0; i < objectCount; i++) {
        const obj = {}
        for (const key of propertyKeys) {
            obj[key] = Array.isArray(response[key]) ? response[key][i] : response[key]
        }
        result.push(obj)
    }

    return result
}

const getConnection = async (server) => {
    try {
        const connection = new Raw({ host: "localhost", port: server.query_port })
        await connection.connectSocket()
        await connection.throttle.set("enable", false)
        await connection.send("login", "serveradmin", server.query_password)
        await connection.send("use", { port: server.server_port })

        return connection
    } catch {
        return
    }
}

exports.getServergroupList = async (req, res) => {
    try {
        const { serverId } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        const sgList = transformTeamspeakResponse(await connection.send("servergrouplist"))
            .sort((a, b) => a.sortid - b.sortid)
            .map((sg) => ({
                sgid: sg.sgid,
                name: sg.name,
            }))

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(sgList)
    } catch {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.getBanList = async (req, res) => {
    try {
        const { serverId } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        const banList = transformTeamspeakResponse(await connection.send("banlist").catch(() => []))

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(banList)
    } catch {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.getOnlineList = async (req, res) => {
    try {
        const { serverId } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        let onlineList = transformTeamspeakResponse(await connection.send("clientlist -groups").catch(() => [])).map(
            (cl) => ({
                clid: cl.clid,
                cldbid: cl.client_database_id,
                name: cl.client_nickname,
                clientServergroups: cl.client_servergroups?.split(","),
                clientType: cl.client_type,
            })
        )

        onlineList = onlineList.filter((cl) => cl.clientType == 0)

        await Promise.all(
            onlineList.map(async (client, i) => {
                return new Promise((resolve) => {
                    connection.send("clientinfo", { clid: client.clid }).then((res) => {
                        onlineList[i].connectionClientIp =
                            res.connection_client_ip || res.client_output_muted || "0.0.0.0"
                        resolve()
                    })
                })
            })
        )

        // for (let client of onlineList) {
        //     client.connectionClientIp = (
        //         await connection.send("clientinfo", { clid: client.clid })
        //     ).connection_client_ip
        // }

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(onlineList)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.serverGroupAdd = async (req, res) => {
    try {
        const { serverId, sgid, cldbid } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        await connection.send("servergroupaddclient", { sgid, cldbid }).catch(() => {})

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.serverGroupDel = async (req, res) => {
    try {
        const { serverId, sgid, cldbid } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        await connection.send("servergroupdelclient", { sgid, cldbid })

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.banClient = async (req, res) => {
    try {
        const { serverId, banTime, banReason, clid } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        await connection.send("banclient", { clid, time: banTime, banreason: banReason }).catch(() => {})

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.unbanClient = async (req, res) => {
    try {
        const { serverId, banid } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        await connection.send("bandel", { banid }).catch(() => {})

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch (err) {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.kickClient = async (req, res) => {
    try {
        const { serverId, clid } = req.body
        const { scope, username } = req.user

        const server = await Servers.findByPk(serverId)
        if (!server) {
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        if (scope == "reseller" && server.author !== username) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const connection = await getConnection(server)
        if (!connection) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.TEAMSPEAK.NOT_ACTIVE)
        }

        await connection.send("clientkick", { clid, reasonid: 5 }).catch(() => {})

        await connection.disconnect()

        return res.status(apiCodes.SUCCESS).json(responses.COMMON.SUCCESS)
    } catch {
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
