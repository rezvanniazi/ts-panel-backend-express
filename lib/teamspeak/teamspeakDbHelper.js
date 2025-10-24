const sqlite3 = require("sqlite3").verbose()
const { teamspeak } = require("../../config")

/**
 * Creates and returns a database connection with proper error handling
 * @param {number} serverPort - The server port
 * @param {number} queryPort - The query port
 * @returns {Promise<sqlite3.Database>} Database connection
 */
function createDatabaseConnection(serverPort, queryPort) {
    return new Promise((resolve, reject) => {
        if (!serverPort || !queryPort) {
            return reject(new Error("Server port and query port are required"))
        }

        const dbPath = `${teamspeak.pathToParentDir}/Teamspeak-${serverPort}-${queryPort}/TeaData.sqlite`

        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(`Failed to open database at ${dbPath}:`, err.message)
                return reject(new Error(`Database connection failed: ${err.message}`))
            }
            resolve(db)
        })

        db.on("error", (err) => {
            console.error("Database error:", err.message)
        })
    })
}

/**
 * Safely closes a database connection
 * @param {sqlite3.Database} db - Database connection to close
 */
function closeDatabase(db) {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error("Error closing database:", err.message)
            }
        })
    }
}

/**
 * Updates server port in TeamSpeak database
 * @param {number} serverPort - Current server port
 * @param {number} queryPort - Query port
 * @returns {Promise<void>}
 */
function changeServerPortInTsDb(serverPort, queryPort) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = `UPDATE servers SET port = ? WHERE serverId = 1`
            db.run(sql, [serverPort], function (err) {
                if (err) {
                    console.error("Failed to update server port:", err.message)
                    return reject(new Error(`Failed to update server port: ${err.message}`))
                }

                if (this.changes === 0) {
                    return reject(new Error("No rows were updated. Server with serverId = 1 not found."))
                }

                console.log(`Server port updated successfully. Rows affected: ${this.changes}`)
                resolve()
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Updates query password in TeamSpeak database
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} queryPassword - New query password
 * @returns {Promise<void>}
 */
function changeSrvQPassInTsDb(serverPort, queryPort, queryPassword) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            if (!queryPassword || queryPassword.trim() === "") {
                return reject(new Error("Query password cannot be empty"))
            }

            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = "UPDATE queries SET password = ? WHERE username = 'serveradmin'"
            db.run(sql, [queryPassword], function (err) {
                if (err) {
                    console.error("Failed to update query password:", err.message)
                    return reject(new Error(`Failed to update query password: ${err.message}`))
                }

                if (this.changes === 0) {
                    return reject(new Error("No rows were updated. serveradmin user not found."))
                }

                console.log(`Query password updated successfully. Rows affected: ${this.changes}`)
                resolve()
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Updates query username in TeamSpeak database
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} username - New username
 * @returns {Promise<void>}
 */
function changeSrvQUserInTsDb(serverPort, queryPort, username) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            if (!username || username.trim() === "") {
                return reject(new Error("Username cannot be empty"))
            }

            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = "UPDATE queries SET username = ? WHERE server = 0"
            db.run(sql, [username], function (err) {
                if (err) {
                    console.error("Failed to update query username:", err.message)
                    return reject(new Error(`Failed to update query username: ${err.message}`))
                }

                if (this.changes === 0) {
                    return reject(new Error("No rows were updated. Query user with server = 0 not found."))
                }

                console.log(`Query username updated successfully. Rows affected: ${this.changes}`)
                resolve()
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Updates server token for TeamSpeak 1.5.6
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} token - New token
 * @returns {Promise<void>}
 */
function changeSrvTokenInTsDb1_5_6(serverPort, queryPort, token) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            if (!token || token.trim() === "") {
                return reject(new Error("Token cannot be empty"))
            }

            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = "UPDATE tokens SET token = ? WHERE server_id = 1"
            db.run(sql, [token], function (err) {
                if (err) {
                    console.error("Failed to update server token (1.5.6):", err.message)
                    return reject(new Error(`Failed to update server token: ${err.message}`))
                }

                if (this.changes === 0) {
                    return reject(new Error("No rows were updated. Token with server_id = 1 not found."))
                }

                console.log(`Server token updated successfully (1.5.6). Rows affected: ${this.changes}`)
                resolve()
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Updates server token for TeamSpeak 1.4.22
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @param {string} token - New token
 * @returns {Promise<void>}
 */
function changeSrvTokenInTsDb1_4_22(serverPort, queryPort, token) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            if (!token || token.trim() === "") {
                return reject(new Error("Token cannot be empty"))
            }

            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = "UPDATE tokens SET token = ? WHERE serverId = 1"
            db.run(sql, [token], function (err) {
                if (err) {
                    console.error("Failed to update server token (1.4.22):", err.message)
                    return reject(new Error(`Failed to update server token: ${err.message}`))
                }

                if (this.changes === 0) {
                    return reject(new Error("No rows were updated. Token with serverId = 1 not found."))
                }

                console.log(`Server token updated successfully (1.4.22). Rows affected: ${this.changes}`)
                resolve()
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Retrieves server admin token from TeamSpeak database
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @returns {Promise<string>} Server admin token
 */
function getServerAdminToken(serverPort, queryPort) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = `SELECT token FROM tokens LIMIT 1`
            db.get(sql, [], (err, row) => {
                if (err) {
                    console.error("Failed to get server admin token:", err.message)
                    return reject(new Error(`Failed to get server admin token: ${err.message}`))
                }

                if (!row || !row.token) {
                    return reject(new Error("No server admin token found"))
                }

                resolve(row.token)
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Retrieves query password from TeamSpeak database
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @returns {Promise<string>} Query password
 */
function getQueryPassword(serverPort, queryPort) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = `SELECT password FROM queries LIMIT 1`
            db.get(sql, [], (err, row) => {
                if (err) {
                    console.error("Failed to get query password:", err.message)
                    return reject(new Error(`Failed to get query password: ${err.message}`))
                }

                if (!row || !row.password) {
                    return reject(new Error("No query password found"))
                }

                resolve(row.password)
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Retrieves server port from TeamSpeak database
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @returns {Promise<number>} Server port
 */
function getServerPort(serverPort, queryPort) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = `SELECT port FROM servers LIMIT 1`
            db.get(sql, [], (err, row) => {
                if (err) {
                    console.error("Failed to get server port:", err.message)
                    return reject(new Error(`Failed to get server port: ${err.message}`))
                }

                if (!row || !row.port) {
                    return reject(new Error("No server port found"))
                }

                resolve(row.port)
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

/**
 * Retrieves query username from TeamSpeak database
 * @param {number} serverPort - Server port
 * @param {number} queryPort - Query port
 * @returns {Promise<string>} Query username
 */
function getQueryUsername(serverPort, queryPort) {
    return new Promise(async (resolve, reject) => {
        let db = null
        try {
            db = await createDatabaseConnection(serverPort, queryPort)

            const sql = `SELECT username FROM queries WHERE server = 0 LIMIT 1`
            db.get(sql, [], (err, row) => {
                if (err) {
                    console.error("Failed to get query username:", err.message)
                    return reject(new Error(`Failed to get query username: ${err.message}`))
                }

                if (!row || !row.username) {
                    return reject(new Error("No query username found for server = 0"))
                }

                resolve(row.username)
            })
        } catch (error) {
            reject(error)
        } finally {
            closeDatabase(db)
        }
    })
}

module.exports = {
    getQueryPassword,
    getQueryUsername,
    getServerAdminToken,
    getServerPort,
    changeServerPortInTsDb,
    changeSrvQPassInTsDb,
    changeSrvQUserInTsDb,
    changeSrvTokenInTsDb1_5_6,
    changeSrvTokenInTsDb1_4_22,
}
