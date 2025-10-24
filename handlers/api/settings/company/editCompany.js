const CompanyList = require("../../../../models/CompanyList")
const cloudflarehelper = require("../../../../lib/teamspeak/cloudflareHelper")
const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")

module.exports = async (req, res) => {
    try {
        const { companyId, name, cloudfToken, domainIp } = req.body

        // fetch company from database and ensure if it's exists
        const company = await CompanyList.findByPk(companyId)
        if (!company) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.COMPANY.COMPANY_NOT_FOUND)
        }
        // check for token change
        if (cloudfToken && cloudfToken !== company.cloudf_token) {
            // Verify new token
            try {
                let zoneId = await cloudflarehelper.verifyDomain(company.domain_name, cloudfToken)

                if (!zoneId) {
                    throw new Error("No zoneId available")
                }
                company.cloudf_token = cloudfToken
            } catch (err) {
                if (err?.code == "INVALID_TOKEN") {
                    return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.COMPANY.INVALID_TOKEN)
                } else if (err?.code == "DOMAIN_NOT_FOUND") {
                    return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.COMPANY.DOMAIN_NOT_FOUND)
                } else {
                    console.error("Edit company error editing token: ", err)

                    return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
                }
            }
        }

        // check for domain ip change
        if (domainIp && domainIp !== company.domain_ip) {
            company.domain_ip = domainIp
        }

        // check for name change
        if (name && name !== company.name) {
            company.name = name
        }
        // save the changes in database
        await company.save()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.COMPANY.EDIT_SUCCESS)
    } catch (err) {
        console.error("Error editing company: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
