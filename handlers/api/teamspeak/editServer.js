const { sequelize } = require("../../../config/database")
const ServerPackages = require("../../../models/ServerPackages")
const Servers = require("../../../models/Servers")
const Users = require("../../../models/Users")
const CompanyList = require("../../../models/CompanyList")
const responses = require("../../../constants/responses")
const apiCodes = require("../../../constants/apiCodes")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const teamspeakDbHelper = require("../../../lib/teamspeak/teamspeakDbHelper")
const teamspeakQuery = require("../../../lib/teamspeak/teamspeakQuery")
const cloudflareHelper = require("../../../lib/teamspeak/cloudflareHelper")
const { createLogger } = require("../../../utils/logger")

const editServer = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id, scope } = req.user

        const { packageName, serverId, version, querypassword, author, information, subdomain, autorenew } = req.body

        const server = await Servers.findByPk(serverId)
        const requestUser = await Users.findByPk(id)

        if (!server) {
            await transaction.rollback()
            return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
        }

        const user = await Users.findOne({ where: { username: server.author } })

        if (!user) {
            await transaction.rollback()
            return res.status(apiCodes.COMPANY_NOT_FOUND).json(responses.TEAMSPEAK.COMPANY_NOT_FOUND)
        }

        // Check permissions
        if (server.author !== requestUser.username && scope !== "admin") {
            await transaction.rollback()
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const serverLogger = createLogger("teamspeak", server.id)
        const userLogger = createLogger("user", user.id)

        // type should be error, done, progress
        function emitStep(type, message) {
            const svc = global.socketService
            if (svc) {
                svc.emitToRoom(requestUser.username, `server_edit_${type}`, message)
            }
        }

        async function changeAuthor() {
            try {
                // Handle author change for admin
                if (scope === "admin" && author && server.author !== author) {
                    server.author = author
                    await server.save({ transaction })
                    serverLogger.info(`Server author changed from ${server.author} to ${author}`)
                }
            } catch (error) {
                serverLogger.error(`Failed to change author: ${error.message}`)
                throw error
            }
        }

        async function changePackage() {
            try {
                // Handle package change
                if (packageName && packageName !== server.package_name) {
                    emitStep("progress", "درحال تغییر پکیج")

                    const serversPackage = await ServerPackages.findOne({
                        where: { package_name: server.package_name },
                    })
                    const newPackage = await ServerPackages.findOne({ where: { package_name: packageName } })

                    if (!newPackage) {
                        throw new Error("New package not found")
                    }

                    let today = new Date()
                    let serverExpires = new Date(server.expires)
                    let serversExpiresInDays = Math.floor(Math.abs(serverExpires - today) / (1000 * 60 * 60 * 24)) - 1
                    serversExpiresInDays = Math.max(0, serversExpiresInDays)

                    let remainedServerAmount = 0

                    if (serversPackage && serversPackage.package_days) {
                        remainedServerAmount = Math.floor(
                            (serversPackage.package_amount / serversPackage.package_days) * serversExpiresInDays
                        )
                    }

                    // Update user balance
                    try {
                        await user.addBalance(remainedServerAmount, transaction)
                        userLogger.info(`مقدار ${remainedServerAmount} به حساب کاربر بابت ویرایش پکیج اضافه شد`)
                        await requestUser.subtractBalance(newPackage.package_amount || 0, transaction)
                        createLogger("user", requestUser.id).info(
                            `مقدار ${newPackage.package_amount} از حساب کاربر بابت تغییر پکیج کسر شد`
                        )
                    } catch (err) {
                        if (err.message === "Insufficient balance") {
                            await transaction.rollback()
                            return res.status(apiCodes.INSUFFICIENT_BALANCE).json({
                                success: false,
                                message: responses.USER.INSUFFICIENT_BALANCE,
                            })
                        }
                        throw err
                    }

                    // Update server package and expiration
                    if (newPackage.package_days) {
                        today.setDate(today.getDate() + newPackage.package_days)
                        server.expires = today
                    } else {
                        server.expires = null
                    }

                    serverLogger.info(`پکیج سرور از ${server.package_name} به ${newPackage.package_name} تغییر یافت`)

                    server.package_name = newPackage.package_name

                    server.state = "active"
                    await server.save({ transaction })

                    // Handle slots change if needed
                    if (server.slots !== newPackage.package_slots) {
                        await teamspeakHelper.start(server)
                        await teamspeakQuery.changeSlots(
                            server.query_port,
                            server.query_password,
                            newPackage.package_slots
                        )
                        serverLogger.info(`اسلات سرور از ${server.slots} به ${newPackage.package_slots} تغییر یافت`)
                        server.slots = newPackage.package_slots
                        await server.save({ transaction })
                    }
                    emitStep("progress", "پکیج تغییر داده شد")
                }
            } catch (error) {
                serverLogger.error(`Failed to change package: ${error.message}`)
                throw error
            }
        }

        async function changeQuerypassword() {
            try {
                // Handle query password change
                if (querypassword && server.query_password !== querypassword && server.state !== "suspended") {
                    emitStep("progress", "درحال تغییر پسورد کوئری")
                    await teamspeakDbHelper.changeSrvQPassInTsDb(server.server_port, server.query_port, querypassword)
                    server.query_password = querypassword
                    await server.save({ transaction })
                    serverLogger.info(`پسورد کوئری سرور تغییر یافت`)
                    emitStep("progress", "پسورد کوئری تغییر یافت")
                }
            } catch (error) {
                serverLogger.error(`Failed to change query password: ${error.message}`)
                throw error
            }
        }

        async function changeVersion() {
            try {
                // Handle version change
                if (version && version !== "" && server.version !== version && server.state !== "suspended") {
                    emitStep("progress", "درحال تغییر ورژن")
                    const oldVersion = server.version

                    server.version = version

                    await teamspeakHelper.delete(server).catch((err) => {
                        console.log(err)
                    })
                    await teamspeakHelper.create({
                        logger: serverLogger,
                        teamspeak: server,
                        globalCommand: user.global_command,
                    })

                    serverLogger.info(`ورژن سرور از ${oldVersion} به ${version} تغییر یافت`)
                    await server.save({ transaction })
                    emitStep("progress", "ورژن تغییر داده شد")
                }
            } catch (error) {
                serverLogger.error(`Failed to change version: ${error.message}`)
                throw error
            }
        }

        async function handleSubdomainChange() {
            try {
                // Handle subdomain changes
                if (subdomain && subdomain !== server.subdomain_name) {
                    emitStep("progress", "درحال تغییر ساب دامنه")

                    const company = await CompanyList.findOne({ where: { name: user.company_name } })

                    if (company) {
                        if (!server.subdomain_name && subdomain !== "") {
                            // Create new subdomain
                            try {
                                const recordId = await cloudflareHelper
                                    .addSrvRecordForTs(subdomain, server.server_port, company)
                                    .catch((err) => {
                                        if (err.message === "Subdomain in use") {
                                            serverLogger.error(
                                                `ساب دامنه ی ${subdomain}.${company.domain_name} در دسترس نمیباشد`
                                            )
                                        } else {
                                            serverLogger.error(
                                                `ساخت ساب دامنه ی ${subdomain}.${company.domain_name} با خطا مواجه شد`
                                            )
                                        }
                                    })
                                server.subdomain_name = subdomain
                                server.subdomain_record_id = recordId
                                serverLogger.info(
                                    `ساب دامنه ی ${subdomain}.${company.domain_name} به این سرور اختصاص داده شد`
                                )

                                await server.save({ transaction })
                            } catch (error) {
                                throw new Error(`Failed to create subdomain: ${error.message}`)
                            }
                        } else if (subdomain === "" && !server.subdomain_name) {
                            // Delete subdomain
                            try {
                                await cloudflareHelper.deleteSrvRecord(
                                    company.domain_zone_id,
                                    server.subdomain_record_id,
                                    company.cloudf_token
                                )
                                serverLogger.info(
                                    `ساب دامنه ی ${server.subdomain_name}.${company.domain_name} از این سرور برداشته شد`
                                )

                                server.subdomain_name = null
                                server.subdomain_record_id = null

                                await server.save({ transaction })
                            } catch (error) {
                                serverLogger.error(`Failed to delete subdomain: ${error.message}`)
                                // Don't throw error for subdomain deletion failure
                            }
                        } else {
                            // Edit subdomain
                            try {
                                await cloudflareHelper
                                    .deleteSrvRecord(company.domain_zone_id, server.subdomain_record_id)
                                    .catch((err) => {
                                        console.log(err.message)
                                    })
                                const recordId = await cloudflareHelper
                                    .addSrvRecordForTs(subdomain, server.server_port, company)
                                    .catch((err) => {
                                        if (err.message === "Subdomain in use") {
                                            serverLogger.error(
                                                `ساب دامنه ی ${subdomain}.${company.domain_name} در دسترس نمیباشد`
                                            )
                                        } else {
                                            serverLogger.error(
                                                `ساخت ساب دامنه ی ${subdomain}.${company.domain_name} با خطا مواجه شد`
                                            )
                                        }
                                    })

                                serverLogger.info(
                                    `ساب دامنه ی سرور از ${server.subdomain_name}.${company.domain_name} به ${subdomain}.${company.domain_name} تغییر یافت`
                                )

                                server.subdomain_name = subdomain
                                server.subdomain_record_id = recordId

                                await server.save({ transaction })
                            } catch (error) {
                                throw new Error(`Failed to edit subdomain: ${error.message}`)
                            }
                        }
                    }
                    emitStep("progress", "ساب دامنه تغییر داده شد")
                }
            } catch (error) {
                serverLogger.error(`Failed to handle subdomain change: ${error.message}`)
                throw error
            }
        }

        async function changeAutorenew() {
            try {
                // Handle autorenew
                if (typeof autorenew == "boolean") {
                    server.autorenew = autorenew
                    await server.save({ transaction })
                    serverLogger.info(`Server autorenew changed to ${autorenew}`)
                }
            } catch (error) {
                serverLogger.error(`Failed to change autorenew: ${error.message}`)
                throw error
            }
        }

        async function changeInformation() {
            try {
                if (information !== undefined) {
                    // Handle info change
                    server.info = information
                    await server.save({ transaction })
                    serverLogger.info(`Server information updated`)
                }
            } catch (error) {
                serverLogger.error(`Failed to change information: ${error.message}`)
                throw error
            }
        }

        // Execute all changes
        await changeAuthor()
        await changePackage()
        await changeQuerypassword()
        await changeVersion()
        await handleSubdomainChange()
        await changeAutorenew()
        await changeInformation()

        emitStep("done", "سرور با موفقیت ویرایش شد")

        await transaction.commit()

        return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.CREATED)
    } catch (error) {
        console.error("Edit server error:", error)

        // Rollback transaction on error
        try {
            await transaction.rollback()
        } catch (rollbackError) {
            console.error("Failed to rollback transaction:", rollbackError)
        }

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

module.exports = editServer
