const config = require("../../config")
const fse = require("fs-extra")
const { spawn } = require("child_process")
const fs = require("fs")
const yaml = require("js-yaml")
const generateRandomString = require("../../utils/generateRandomString")
const teamspeakDbHelper = require("./teamspeakDbHelper")
const teamspeakQuery = require("./teamspeakQuery")
const { setCache } = require("../../services/redis/cacheService")
/**
 *
 * @param {object} params - The parameters for creation.
 * @param {number} params.slots - The Slots of server.
 * @param {string} params.version - Shuould be 1.5.6 or 1.4.22
 * @param {number} params.serverport - Teamspeaks serverport
 * @param {number} params.queryport - Teamspeaks queryport
 * @param {number} params.fileport - Teamspeaks fileport.
 * @param {string} params.queryPassword - Teamspeaks query password.
 * @param {string} params.globalCommand - commands that should be sent after creation.
 */
exports.create = async ({ logger = null, teamspeak, globalCommand }) => {
    const {
        slots,
        version,
        author,
        server_port: serverport,
        query_port: queryport,
        file_port: fileport,
        query_password: queryPassword,
    } = teamspeak

    console.time("Create Server")
    function logStep(message) {
        if (logger) {
            logger.info(message)
        }
        const svc = global.socketService
        if (svc && author) {
            svc.emitToRoom(author, "server_create_progress", message)
        }
    }
    function logError(message) {
        if (logger) {
            logger.error(message)
        }
        const svc = global.socketService
        if (svc && author) {
            svc.emitToRoom(author, "server_create_error", message)
        }
    }
    function logDone(message) {
        if (logger) {
            logger.info(message)
        }
        const svc = global.socketService
        if (svc && author) {
            svc.emitToRoom(author, "server_create_done", message)
        }
    }

    // Get socket service for logging

    async function copyFiles() {
        logStep("درحال کپی کردن فایل ها")

        const versionToFileName = {
            "1.5.6": "TeaSpeak-1.5.6",
            "1.4.22": "TeaSpeak-1.4.22",
        }

        const fileName = versionToFileName[version]

        if (!fileName) {
            const error = new Error("Invalid version")
            logError("خطای ورژن")

            throw error
        }

        const srcDir = `${config.teamspeak.pathToParentDir}/${fileName}`
        const dstDir = `${config.teamspeak.pathToParentDir}/Teamspeak-${serverport}-${queryport}`

        try {
            await fse.copy(srcDir, dstDir)
            logStep("فایل با موفقیت کپی شد")
        } catch (err) {
            console.log(err)
            logError("خطا در کپی کردن فایل ها")
            throw new Error("copyFiles Error", err)
        }
    }

    async function alterTsDatabase() {
        logStep("درحال تغییر اسلات, توکن, پسورد و غیره")

        try {
            const serverAdminToken = generateRandomString(30)
            if (version == "1.5.6") {
                await teamspeakDbHelper.changeSrvTokenInTsDb1_5_6(serverport, queryport, serverAdminToken)
            } else {
                await teamspeakDbHelper.changeSrvTokenInTsDb1_4_22(serverport, queryport, serverAdminToken)
            }
            await teamspeakDbHelper.changeSrvQPassInTsDb(serverport, queryport, queryPassword)
            await teamspeakDbHelper.changeServerPortInTsDb(serverport, queryport)

            logStep("کانفیگ سرور با موفقیت انجام شد")
        } catch (error) {
            logError("خطا در کانفیگ کردن سرور")
            throw error
        }
    }

    async function alterYamlFile() {
        logStep("درحال کانفیگ فایل config.yml")

        try {
            const pathToTs = `${config.teamspeak.pathToParentDir}/Teamspeak-${serverport}-${queryport}`
            const pathToConfigYml = `${pathToTs}/config.yml`

            // Check if config file exists
            if (!fs.existsSync(pathToConfigYml)) {
                const error = new Error(`Configuration file not found: ${pathToConfigYml}`)
                logError("خطای در کانفیگ فایل config.yml")
                throw error
            }

            const data = fs.readFileSync(pathToConfigYml, "utf8")
            const configYml = await yaml.load(data)

            // Update configuration settings
            configYml.binding.query.port = queryport
            configYml.binding.file.port = fileport
            configYml.voice.default_port = serverport

            // Write the updated configuration back to file
            fs.writeFileSync(pathToConfigYml, yaml.dump(configYml))

            logStep("کانفیچ فایل config.yml با موفقیت انجام شد")
        } catch (error) {
            if (logger) {
                logError("خطای در کانفیگ فایل config.yml")
            }
            throw new Error(`Configuration update failed: ${error.message}`)
        }
    }

    async function sendGlobalCommand() {
        // Wait a bit for the server to fully start
        logStep("درحال ارسال دستور همگانی")

        await new Promise((resolve) => setTimeout(resolve, 5000))

        await teamspeakQuery.sendCustomCommand(
            queryport,
            queryPassword,
            "instanceedit serverinstance_serverquery_max_connections_per_ip=10 serverinstance_query_max_connections=10"
        )

        if (!globalCommand || globalCommand.trim() === "") {
            logStep("دستور همگانی برای ارسال وجود ندارد")
            return
        }

        try {
            await teamspeakQuery.sendCustomCommand(queryport, queryPassword, globalCommand)

            logStep("دستور همگانی با موفقیت ارسال شد")
        } catch (error) {
            logStep("خطا در ارسال دستور همگانی")
            // Don't throw error here as it's not critical for server creation
        }
    }

    async function startServer() {
        logStep("درحال روشن کردن سرور")

        try {
            const result = await exports.start(teamspeak)

            logStep("سرور روشن شد")

            return result
        } catch (error) {
            logStep("خطا در روشن کردن سرور")
            throw error
        }
    }

    async function changeSlots() {
        logStep("درحال تغییر اسلات")
        await teamspeakQuery.changeSlots(queryport, queryPassword, slots)

        logStep("اسلات با موفقیت تغییر یافت")
    }

    try {
        await copyFiles()
        await alterTsDatabase()
        await alterYamlFile()
        await startServer()
        await sendGlobalCommand()
        await changeSlots()

        const result = {
            success: true,
            message: "Server created successfully",
            serverPort: serverport,
            queryPort: queryport,
        }

        // Log final success
        logDone("ساخت سرور با موفقیت به اتمام رسید")

        return result
    } catch (err) {
        // Log final error
        console.log(err)
        logError("مشکلی در ساخت سرور بوجود امده است")
        throw new Error(err)
    } finally {
        console.timeEnd("Create Server")
    }
}

/**
 * Starts a TeamSpeak server using the teastart.sh script
 * @param {object} params - The parameters for starting the server
 * @param {number} params.serverport - TeamSpeak server port
 * @param {number} params.queryport - TeamSpeak query port
 * @returns {Promise<object>} Result object with status and message
 */
exports.start = async (server) => {
    const serverport = server.server_port
    const queryport = server.query_port

    return new Promise((resolve, reject) => {
        if (!serverport || !queryport) {
            return reject(new Error("Server port and query port are required"))
        }

        const serverDir = `${config.teamspeak.pathToParentDir}/Teamspeak-${serverport}-${queryport}`
        const scriptPath = `${serverDir}/teastart.sh`

        // Check if the server directory and script exist
        if (!fse.existsSync(serverDir)) {
            return reject(new Error(`Server directory not found: ${serverDir}`))
        }

        if (!fse.existsSync(scriptPath)) {
            return reject(new Error(`teastart.sh script not found: ${scriptPath}`))
        }

        console.log(`Starting TeamSpeak server at ${serverDir}`)
        console.time("Start Server")

        // Spawn the teastart.sh script
        const child = spawn("./teastart.sh", ["start"], {
            cwd: serverDir,
            stdio: ["pipe", "pipe", "pipe"],
        })

        let stdout = ""
        let stderr = ""

        child.stdout.on("data", (data) => {
            stdout += data.toString()
        })

        child.stderr.on("data", (data) => {
            stderr += data.toString()
        })

        child.on("close", (code) => {
            console.timeEnd("Start Server")

            const output = stdout.trim()
            const errorOutput = stderr.trim()

            // Handle different output scenarios
            if (output.includes("TeaSpeak server started, for details please view the log file")) {
                setCache(`teamspeak-${server.id}`, { status: "online" })

                console.log(`✅ TeamSpeak server started successfully on port ${serverport}`)
                resolve({
                    success: true,
                    status: "started",
                    message: "Server started successfully",
                    output: output,
                    serverPort: serverport,
                    queryPort: queryport,
                })
            } else if (output.includes("The server is already running, try restart or stop")) {
                setCache(`teamspeak-${server.id}`, { status: "online" })

                console.log(`⚠️  TeamSpeak server is already running on port ${serverport}`)
                resolve({
                    success: true,
                    status: "already_running",
                    message: "Server is already running",
                    output: output,
                    serverPort: serverport,
                    queryPort: queryport,
                })
            } else if (code !== 0) {
                setCache(`teamspeak-${server.id}`, { status: "offline" })

                const errorMessage = errorOutput || output || "Unknown error occurred"
                console.error(`❌ Failed to start TeamSpeak server on port ${serverport}:`, errorMessage)
                reject(new Error(`Failed to start server: ${errorMessage}`))
            } else {
                // Unexpected output
                setCache(`teamspeak-${server.id}`, { status: "online" })

                console.log(`ℹ️  TeamSpeak server start completed with unexpected output on port ${serverport}`)
                resolve({
                    success: true,
                    status: "unknown",
                    message: "Server start completed with unexpected output",
                    output: output,
                    serverPort: serverport,
                    queryPort: queryport,
                })
            }
        })

        child.on("error", (error) => {
            console.timeEnd("Start Server")
            console.error(`❌ Error spawning teastart.sh process:`, error.message)
            reject(new Error(`Process spawn error: ${error.message}`))
        })

        // Set a timeout to prevent hanging
        setTimeout(() => {
            child.kill("SIGTERM")
            console.timeEnd("Start Server")
            reject(new Error("Server start operation timed out"))
        }, 30000) // 30 second timeout
    })
}

exports.delete = async (server) => {
    const serverport = server.server_port
    const queryport = server.query_port

    function removeServerFolder(serverport, queryport) {
        return new Promise((resolve, reject) => {
            try {
                fs.rmdirSync(`${config.teamspeak.pathToParentDir}/Teamspeak-${serverport}-${queryport}`, {
                    recursive: true,
                })
                resolve()
            } catch (err) {
                console.log(err)
                resolve()
            }
        })
    }

    await exports.stop(server)
    await removeServerFolder(serverport, queryport)
}

/**
 * Stops a TeamSpeak server using the teastart.sh script
 * @param {object} params - The parameters for stopping the server
 * @param {number} params.serverport - TeamSpeak server port
 * @param {number} params.queryport - TeamSpeak query port
 * @returns {Promise<object>} Result object with status and message
 */
exports.stop = async (server) => {
    const serverport = server.server_port
    const queryport = server.query_port

    return new Promise((resolve, reject) => {
        if (!serverport || !queryport) {
            return reject(new Error("Server port and query port are required"))
        }

        const serverDir = `${config.teamspeak.pathToParentDir}/Teamspeak-${serverport}-${queryport}`
        const scriptPath = `${serverDir}/teastart.sh`

        // Check if the server directory and script exist
        if (!fse.existsSync(serverDir)) {
            return reject(new Error(`Server directory not found: ${serverDir}`))
        }

        if (!fse.existsSync(scriptPath)) {
            return reject(new Error(`teastart.sh script not found: ${scriptPath}`))
        }

        console.log(`Stopping TeamSpeak server at ${serverDir}`)
        console.time("Stop Server")

        // Spawn the teastart.sh script with stop command
        const child = spawn("./teastart.sh", ["stop"], {
            cwd: serverDir,
            stdio: ["pipe", "pipe", "pipe"],
        })

        let stdout = ""
        let stderr = ""

        child.stdout.on("data", (data) => {
            stdout += data.toString()
        })

        child.stderr.on("data", (data) => {
            stderr += data.toString()
        })

        child.on("close", (code) => {
            console.timeEnd("Stop Server")

            const output = stdout.trim()
            const errorOutput = stderr.trim()

            // Handle different output scenarios based on your requirements
            if (output.includes("done")) {
                console.log(`✅ TeamSpeak server stopped successfully on port ${serverport}`)
                resolve({
                    success: true,
                    status: "stopped",
                    message: "Server stopped successfully",
                    output: output,
                    serverPort: serverport,
                    queryPort: queryport,
                })
            } else if (output.includes("Server seems to have died") || output.includes("No server running")) {
                console.log(`ℹ️  TeamSpeak server is not running on port ${serverport}`)
                resolve({
                    success: true,
                    status: "not_running",
                    message: "Server is not running",
                    output: output,
                    serverPort: serverport,
                    queryPort: queryport,
                })
            } else if (code !== 0) {
                const errorMessage = errorOutput || output || "Unknown error occurred"
                console.error(`❌ Failed to stop TeamSpeak server on port ${serverport}:`, errorMessage)
                reject(new Error(`Failed to stop server: ${errorMessage}`))
            } else {
                // Unexpected output
                console.log(`ℹ️  TeamSpeak server stop completed with unexpected output on port ${serverport}`)
                resolve({
                    success: true,
                    status: "unknown",
                    message: "Server stop completed with unexpected output",
                    output: output,
                    serverPort: serverport,
                    queryPort: queryport,
                })
            }
            setCache(`teamspeak-${server.id}`, { status: "offline" })
        })

        child.on("error", (error) => {
            console.timeEnd("Stop Server")
            console.error(`❌ Error spawning teastart.sh process:`, error.message)
            reject(new Error(`Process spawn error: ${error.message}`))
        })

        // Set a timeout to prevent hanging
        setTimeout(() => {
            child.kill("SIGTERM")
            console.timeEnd("Stop Server")
            reject(new Error("Server stop operation timed out"))
        }, 10000) // 10 second timeout as specified
    })
}

exports.status = async (server) => {
    const serverport = server.server_port
    const queryport = server.query_port

    return new Promise((resolve, reject) => {
        if (!serverport || !queryport) {
            return reject(new Error("Server port and query port are required"))
        }

        const serverDir = `${config.teamspeak.pathToParentDir}/Teamspeak-${serverport}-${queryport}`
        const scriptPath = `${serverDir}/teastart.sh`

        // Check if the server directory and script exist
        if (!fse.existsSync(serverDir)) {
            return reject(new Error(`Server directory not found: ${serverDir}`))
        }

        if (!fse.existsSync(scriptPath)) {
            return reject(new Error(`teastart.sh script not found: ${scriptPath}`))
        }

        // Spawn the teastart.sh script
        const child = spawn("./teastart.sh", ["status"], {
            cwd: serverDir,
            stdio: ["pipe", "pipe", "pipe"],
        })

        child.on("close", (code) => {
            if (code === 0) {
                setCache(`teamspeak-${server.id}`, { status: "online" })

                resolve({
                    status: "online",
                })
            } else {
                setCache(`teamspeak-${server.id}`, { status: "offline" })

                resolve({ status: "offline" })
            }
        })

        child.on("error", (error) => {
            console.error(`❌ Error spawning teastart.sh process:`, error.message)
            reject(new Error(`Process spawn error: ${error.message}`))
        })

        // Set a timeout to prevent hanging
        setTimeout(() => {
            child.kill("SIGTERM")
            reject(new Error("Server status operation timed out"))
        }, 30000) // 30 second timeout
    })
}
