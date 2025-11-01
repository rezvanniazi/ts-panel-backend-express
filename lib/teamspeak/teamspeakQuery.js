"use strict"

const { TeamSpeak } = require("ts3-nodejs-library")
const createSnapshotFile = require("../utils/createSnapshotFile")
const getSnapshotData = require("../utils/getSnapshotData")
const { Raw } = require("teamspeak-query")

/**
 * Creates a TeamSpeak connection with proper error handling
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<TeamSpeak>} TeamSpeak connection
 */
async function createConnection(serverPort, queryPort, queryPassword) {
    try {
        const connection = await TeamSpeak.connect({
            host: "localhost",
            serverport: serverPort,
            queryport: queryPort,
            username: "serveradmin",
            protocol: "raw",
            password: queryPassword,
            nickname: "ServerManager",
            keepAlive: true,
            keepAliveTimeout: 250,
            timeout: 10000,
        })
        return connection
    } catch (error) {
        throw new Error(`Connection failed: ${error.message}`)
    }
}

/**
 * Stops the TeamSpeak server
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<void>}
 */
async function stopServer(serverPort, queryPort, queryPassword) {
    let connection = null
    try {
        connection = await createConnection(serverPort, queryPort, queryPassword)
        await connection.serverProcessStop()
        console.log(`✅ Server stopped successfully on port ${serverPort}`)
    } catch (error) {
        console.error(`❌ Failed to stop server: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Creates a server snapshot
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<string>} Snapshot data
 */
async function createSnapshot(serverPort, queryPort, queryPassword) {
    let connection = null
    try {
        connection = await createConnection(serverPort, queryPort, queryPassword)
        const snapshot = await connection.createSnapshot()
        await createSnapshotFile(snapshot, serverPort, queryPort)
        console.log(`✅ Snapshot created successfully for server on port ${serverPort}`)
        return snapshot
    } catch (error) {
        console.error(`❌ Failed to create snapshot: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Deploys a server snapshot
 * @param {string} snapshotName - Name of the snapshot
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<void>}
 */
async function deploySnapshot(snapshotName, serverPort, queryPort, queryPassword) {
    let teamspeak = null
    try {
        const snapshot = await getSnapshotData(snapshotName, serverPort, queryPort)

        teamspeak = new Raw({ host: "localhost", port: queryPort })
        await teamspeak.connectSocket()
        await teamspeak.send("login", "serveradmin", queryPassword)
        await teamspeak.send("use", 1)
        const res = await teamspeak.send("serversnapshotdeploy", snapshot).catch((err) => console.log(err))
        console.log(`✅ Snapshot deployed successfully: ${snapshotName}`)
    } catch (error) {
        console.error(`❌ Failed to deploy snapshot: ${error.message}`)
        throw error
    } finally {
        if (teamspeak) {
            await teamspeak.disconnect()
        }
    }
}

/**
 * Sends a message to the server
 * @param {number} serverport - Server port
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {string} msg - Message to send
 * @returns {Promise<void>}
 */
async function sendMessageToServer(serverPort, queryPort, queryPassword, msg) {
    let connection = null
    try {
        connection = await createConnection(serverPort, queryPort, queryPassword)
        await connection.sendTextMessage(1, 3, msg)
        console.log(`✅ Message sent to server: ${msg}`)
    } catch (error) {
        console.error(`❌ Failed to send message: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Sends a custom command to the server
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {string} command - Custom command to execute
 * @returns {Promise<any>} Command response
 */
async function sendCustomCommand(queryPort, queryPassword, command) {
    let connection = null
    try {
        connection = new Raw({ host: "localhost", port: queryPort })
        await connection.connectSocket()
        await connection.send("login", "serveradmin", queryPassword)
        await connection.send("use", 1)
        const response = await connection.send(command)
        console.log(`✅ Custom command executed: ${command}`)
        return response
    } catch (error) {
        console.error(`❌ Failed to execute custom command: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.disconnect()
        }
    }
}

/**
 * Kicks a client from the server
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {number} clid - Client ID
 * @returns {Promise<void>}
 */
async function kickClient(queryPort, queryPassword, clid) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        await connection.clientKick(clid, 5) // 5 = Server kick
        console.log(`✅ Client ${clid} kicked successfully`)
    } catch (error) {
        console.error(`❌ Failed to kick client: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Bans a client from the server
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {number} clid - Client ID
 * @param {number} banTime - Ban duration in seconds (0 for permanent)
 * @param {string} banReason - Reason for the ban
 * @returns {Promise<object>} Ban result
 */
async function banClient(queryPort, queryPassword, clid, banTime, banReason) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        const ban = await connection.clientBan(clid, banTime, banReason)
        console.log(`✅ Client ${clid} banned successfully`)
        return { code: 200, msg: "Success", banId: ban.banid }
    } catch (error) {
        if (error.id === 2568) {
            return { code: 410, msg: "Insufficient Permission" }
        }
        console.error(`❌ Failed to ban client: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Adds a ban entry
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {object} banData - Ban data object
 * @returns {Promise<void>}
 */
async function banAdd(queryPort, queryPassword, { ip = null, name = null, time = 0, banreason = null, uid = null }) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        const banOptions = {}

        if (ip) banOptions.ip = ip
        if (name) banOptions.name = name
        if (time !== 0) banOptions.time = time
        if (banreason) banOptions.banreason = banreason
        if (uid) banOptions.uid = uid

        await connection.banAdd(banOptions)
        console.log(`✅ Ban added successfully`)
    } catch (error) {
        console.error(`❌ Failed to add ban: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Removes a ban entry
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {number} banId - Ban ID to remove
 * @returns {Promise<void>}
 */
async function unbanUser(queryPort, queryPassword, banId) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        await connection.banDel(banId)
        console.log(`✅ Ban ${banId} removed successfully`)
    } catch (error) {
        console.error(`❌ Failed to remove ban: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Adds a client to a server group
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {number} sgid - Server group ID
 * @param {number} cldbid - Client database ID
 * @returns {Promise<void>}
 */
async function addServerGroup(queryPort, queryPassword, sgid, cldbid) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        await connection.serverGroupAddClient(sgid, cldbid)
        console.log(`✅ Client ${cldbid} added to server group ${sgid}`)
    } catch (error) {
        console.error(`❌ Failed to add client to server group: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Removes a client from a server group
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {number} sgid - Server group ID
 * @param {number} cldbid - Client database ID
 * @returns {Promise<void>}
 */
async function removeServerGroup(queryPort, queryPassword, sgid, cldbid) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        await connection.serverGroupDelClient(sgid, cldbid)
        console.log(`✅ Client ${cldbid} removed from server group ${sgid}`)
    } catch (error) {
        console.error(`❌ Failed to remove client from server group: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Changes the server slot limit
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {number} slots - New slot limit
 * @returns {Promise<void>}
 */
async function changeSlots(queryPort, queryPassword, slots) {
    let teamspeak = null
    try {
        teamspeak = new Raw({ host: "localhost", port: queryPort })
        await teamspeak.connectSocket()
        await teamspeak.send("login", "serveradmin", queryPassword)
        await teamspeak.send("use", 1)
        await teamspeak.send("serveredit", { virtualserver_maxclients: slots })
        console.log(`✅ Server slots changed to ${slots}`)
    } catch (error) {
        if (error.id === 2568) {
            throw { id: 2568, message: "Insufficient Permission" }
        }
        console.error(`❌ Failed to change slots: ${error.message}`)
        throw error
    } finally {
        if (teamspeak) {
            await teamspeak.disconnect()
        }
    }
}

/**
 * Disables the server with a message
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<void>}
 */
async function disableServer(queryPort, queryPassword) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        await connection.serverEdit({
            virtualserver_hostmessage:
                "سرور شما به دلیل تغییرات دادن اسلات مسدود شده برای رفع مشکل به مدیریت سرور مراجعه کنید",
            virtualserver_hostmessage_mode: 3,
        })
        console.log(`✅ Server disabled successfully`)
    } catch (error) {
        if (error.id === 2568) {
            throw { id: 2568, message: "Insufficient Permission" }
        }
        console.error(`❌ Failed to disable server: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Gets the current server slot limit
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<number>} Current slot limit
 */
async function getSlots(queryPort, queryPassword) {
    let teamspeak = null
    try {
        teamspeak = new Raw({ host: "localhost", port: queryPort })
        await teamspeak.connectSocket()
        await teamspeak.send("login", "serveradmin", queryPassword)
        await teamspeak.send("use", 1)
        const serverInfo = await teamspeak.send("serverinfo")
        return serverInfo.virtualserver_maxclients
    } catch (error) {
        throw error
    } finally {
        if (teamspeak) {
            await teamspeak.disconnect()
        }
    }
}

/**
 * Gets the ban list
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<Array>} Ban list
 */
async function getBanList(queryPort, queryPassword) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        const banList = await connection.banList()
        return banList
    } catch (error) {
        console.error(`❌ Failed to get ban list: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Gets online clients
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<Array>} Online clients
 */
async function getOnlineClients(serverPort, queryPort, queryPassword) {
    let connection = null
    try {
        connection = await createConnection(serverPort, queryPort, queryPassword)
        const clients = await connection.clientList({ clientType: 0 })
        return clients.map((client) => client.propcache) || []
    } catch (error) {
        console.error(`❌ Failed to get online clients: ${error.message}`)
        return []
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Gets server group list
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<Array>} Server group list
 */
async function getServerGroupList(queryPort, queryPassword) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        const serverGroups = await connection.serverGroupList()
        return serverGroups
    } catch (error) {
        console.error(`❌ Failed to get server group list: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

async function getChannelList(serverPort, queryPort, queryPassword) {}

/**
 * Gets server groups by client ID
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @param {number} cldbid - Client database ID
 * @returns {Promise<Array>} Server groups for the client
 */
async function getServerGroupsByClientId(queryPort, queryPassword, cldbid) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        const serverGroups = await connection.serverGroupsByClientId(cldbid)
        return serverGroups
    } catch (error) {
        console.error(`❌ Failed to get server groups by client ID: ${error.message}`)
        throw error
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

/**
 * Gets server information
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - Query password
 * @returns {Promise<object>} Server information
 */
async function getServerInfo(queryPort, queryPassword) {
    let connection = null
    try {
        connection = await createConnection(null, queryPort, queryPassword)
        const serverInfo = await connection.serverInfo()
        return serverInfo
    } catch (error) {
        console.error(`❌ Failed to get server info: ${error.message}`)
        return null
    } finally {
        if (connection) {
            await connection.quit()
        }
    }
}

module.exports = {
    createSnapshot,
    deploySnapshot,
    sendMessageToServer,
    kickClient,
    banClient,
    banAdd,
    unbanUser,
    getServerInfo,
    getBanList,
    getOnlineClients,
    sendCustomCommand,
    getServerGroupList,
    getServerGroupsByClientId,
    changeSlots,
    disableServer,
    getSlots,
    addServerGroup,
    removeServerGroup,
    stopServer,
}
