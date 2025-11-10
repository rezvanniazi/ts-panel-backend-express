const { sequelize } = require("../../../config/database")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const UsedPorts = require("../../../models/UsedPorts")
const Users = require("../../../models/Users")
const ServerPackages = require("../../../models/ServerPackages")
const CompanyList = require("../../../models/CompanyList")
const cloudflareHelper = require("../../../lib/teamspeak/cloudflareHelper")
const Servers = require("../../../models/Servers")
const generateRandomString = require("../../../utils/generateRandomString")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const { createLogger, clearLog } = require("../../../utils/logger")

async function checkPorts(serverport, queryport, transaction) {
    try {
        // 1. First validate provided ports (if any)
        if (serverport) {
            const isValid = await UsedPorts.isValid(serverport, { transaction })
            if (!isValid) {
                throw new Error("Invalid server port", {
                    json: responses.TEAMSPEAK.PORT_NOT_VALID,
                    status: apiCodes.PORT_NOT_VALID,
                })
            }
        }

        if (queryport) {
            const isValid = await UsedPorts.isValid(queryport, { transaction })
            if (!isValid) {
                throw new Error("Invalid query port", {
                    json: responses.TEAMSPEAK.PORT_NOT_VALID,
                    status: apiCodes.PORT_NOT_VALID,
                })
            }
        }

        // Always auto-assign fileport
        const fileport = await (async () => {
            const port = await UsedPorts.findAvailable()
            await UsedPorts.create({ port })
            return port
        })()

        const finalServerport = serverport
            ? await (async () => {
                  await UsedPorts.create({ port: serverport })
                  return serverport
              })()
            : await (async () => {
                  const port = await UsedPorts.findAvailable()
                  await UsedPorts.create({ port })
                  return port
              })()

        const finalQueryport = queryport
            ? await (async () => {
                  await UsedPorts.create({ port: queryport })
                  return queryport
              })()
            : await (async () => {
                  const port = await UsedPorts.findAvailable()
                  await UsedPorts.create({ port })
                  return port
              })()

        return {
            finalFileport: fileport,
            finalServerport: finalServerport, // Will match input serverport if provided
            finalQueryport: finalQueryport, // Will match input queryport if provided
        }
    } catch (error) {
        await transaction.rollback()
        throw error // Re-throw with original error details
    }
}

const createServer = async (req, res) => {
    const transaction = await sequelize.transaction()

    const { id, username, companyName } = req.user
    let { packageName, version, serverport, queryport, information, subdomain, autorenew } = req.body
    let queryPassword = generateRandomString(10)

    const user = await Users.findByPk(id)
    const package = await ServerPackages.findOne({ where: { package_name: packageName } })
    if (!package || (package && package.package_for_admin && user.scope == "reseller")) {
        return res.status(apiCodes.PACKAGE_NOT_FOUND).json(responses.TEAMSPEAK.PACKAGE_NOT_FOUND)
    }

    const company = await CompanyList.findOne({ where: { name: companyName } })
    if (!company) {
        return res.status(apiCodes.COMPANY_NOT_FOUND).json(responses.TEAMSPEAK.COMPANY_NOT_FOUND)
    }

    //////////////////// Validation ///////////////////////////
    // Try to substract balance if doesn't have enough balance returns error
    try {
        await user.subtractBalance(package.package_amount, transaction)
    } catch (err) {
        if (err.message == "Insufficient balance") {
            console.log(`User ${user.username} doesn't have enough balance to create server`)
        } else {
            console.log(err)
        }
        transaction.rollback()
        return res.status(apiCodes.INSUFFICIENT_BALANCE).json(responses.USER.INSUFFICIENT_BALANCE)
    }

    try {
        var { finalFileport, finalServerport, finalQueryport } = await checkPorts(serverport, queryport, transaction)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.PORT_NOT_VALID).json(responses.TEAMSPEAK.PORT_NOT_VALID)
    }

    ////////////////////////////////////////////////////////////////
    // insert into database
    let expireDate

    if (package.package_days && package.package_days != 0) {
        const today = new Date()
        today.setDate(today.getDate() + package.package_days)
        expireDate = today
    }

    const teamspeak = await Servers.create(
        {
            server_port: finalServerport,
            query_port: finalQueryport,
            file_port: finalFileport,
            query_password: queryPassword,
            author: username,
            slots: package.package_slots,
            expires: expireDate,
            version: version,
            info: information,
            package_name: package.package_name,
            autorenew,
        },
        { transaction }
    )
    const serverLogger = createLogger("teamspeak", teamspeak.id)
    const userLogger = createLogger("user", user.id)
    //////////////////////////////////////////////////////////////////

    try {
        await teamspeakHelper.create({
            logger: serverLogger,
            teamspeak,
            globalCommand: user.global_command,
        })
    } catch (err) {
        if (err.message == "copyFiles Error") {
            transaction.rollback()
            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json("error copying files")
        } else {
            console.log(err)
        }
    } finally {
        serverLogger.info(
            `سرور ${finalServerport}-${finalQueryport} با موفقیت با پکیج ${package.package_description} با قیمت ${package.package_amount} توسط ${user.username} ساخته شد`
        )
        userLogger.info(
            `مقدار ${package.package_amount} از حساب کاربر بابت ساخت سرور ${finalServerport}-${finalQueryport} کسر شد`
        )
        transaction.commit()
    }

    if (subdomain) {
        try {
            let recordId = await cloudflareHelper.addSrvRecordForTs(subdomain, serverport, company)
            await teamspeak.update({ subdomain_record_id: recordId, subdomain_name: subdomain })

            serverLogger.info(`ساب دامنه ی ${subdomain + "." + company.domain_name} به این سرور اختصاص داده شد`)
        } catch (err) {
            console.log(err)
        }
    }

    return res.status(apiCodes.SUCCESS).json(teamspeak)
}

module.exports = createServer
