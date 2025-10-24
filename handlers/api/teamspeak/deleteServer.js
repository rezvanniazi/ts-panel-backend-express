const ServerPackages = require("../../../models/ServerPackages")
const Servers = require("../../../models/Servers")
const Users = require("../../../models/Users")
const responses = require("../../../constants/responses")
const apiCodes = require("../../../constants/apiCodes")
const teamspeakHelper = require("../../../lib/teamspeak/teamspeakHelper")
const CompanyList = require("../../../models/CompanyList")
const cloudflareHelper = require("../../../lib/teamspeak/cloudflareHelper")
const { createLogger, clearLog } = require("../../../utils/logger")

function calculateRemainedAmount(server, package) {
    const today = new Date()
    const serverExpires = new Date(server.expires)
    const daysRemaining = Math.max(0, Math.floor((serverExpires - today) / (1000 * 60 * 60 * 24)) - 1)

    return Math.floor((package.package_amount / package.package_days) * daysRemaining)
}

const deleteServer = async (req, res) => {
    const { serverId } = req.body
    let server
    let user

    try {
        const userLogger = createLogger("user", req.user.id)

        server = await Servers.findByPk(serverId)
        user = await Users.findByPk(req.user.id)
        if (!server || (server.author !== user.username && user.scope !== "admin")) {
            return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
        }

        const package = await ServerPackages.findOne({ where: { package_name: server.package_name } })

        if (package && package.package_days && package.package_days > 0) {
            const remainedAmount = calculateRemainedAmount(server, package)
            userLogger.info(`مقدار ${remainedAmount} به حساب این کاربر اضافه شد بابت حذف سرور تیم اسپیک`)

            await user.addBalance(remainedAmount)
        }
        await teamspeakHelper.delete(server)

        return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.DELETED)
    } catch (err) {
        console.log(err)
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    } finally {
        if (server.subdomain_name && server.subdomain_record_id) {
            const company = await CompanyList.findOne({ where: { name: user.company_name } })

            await cloudflareHelper.deleteSrvRecord(
                company.domain_zone_id,
                server.subdomain_record_id,
                company.cloudf_token
            )
        }

        await server.destroy()
        clearLog("teamspeak", serverId)
    }
}

module.exports = deleteServer
