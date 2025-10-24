const CompanyList = require("../../../../models/CompanyList")
const cloudflarehelper = require("../../../../lib/teamspeak/cloudflareHelper")
const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const { createLogger } = require("../../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { name, domainName, cloudfToken, domainIp } = req.body
        const userLogger = createLogger("user", req.user.id)

        // Verify domain and token in cloudflare
        let zoneId = await cloudflarehelper.verifyDomain(domainName, cloudfToken)

        if (!zoneId) {
            throw new Error("No zoneId available")
        }
        // Insert to database
        await CompanyList.create({
            name,
            domain_name: domainName,
            cloudf_token: cloudfToken,
            domain_zone_id: zoneId,
            domain_ip: domainIp,
        })

        userLogger.info(`شرکت ${name} با دامنه ${domainName} توسط ${req.user.username} ایجاد شد`)
        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.COMPANY.CREATE_SUCCESS)
    } catch (err) {
        if (err.code == "INVALID_TOKEN") {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.COMPANY.INVALID_TOKEN)
        } else if (err.code == "DOMAIN_NOT_FOUND") {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.COMPANY.DOMAIN_NOT_FOUND)
        } else {
            console.error("Create company error: ", err)

            return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
        }
    }
}
