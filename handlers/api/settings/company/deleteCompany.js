const CompanyList = require("../../../../models/CompanyList")
const Users = require("../../../../models/Users")

const cloudflarehelper = require("../../../../lib/teamspeak/cloudflareHelper")
const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const { createLogger } = require("../../../../utils/logger")

module.exports = async (req, res) => {
    try {
        const { companyId } = req.body
        const userLogger = createLogger("user", req.user.id)

        // Fetch company from database and ensure it exists
        const company = await CompanyList.findByPk(companyId)
        if (!company) {
            userLogger.error(`شرکت با ایدی ${companyId} توسط ${req.user.username} پیدا نشد`)
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.COMPANY.COMPANY_NOT_FOUND)
        }
        // Check if company have members and throw error if there is
        const companyUsers = await Users.findAll({ where: { company_name: company.name } })
        if (companyUsers.length > 0) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.COMPANY.HAS_MEMBER)
        }

        // Delete all srv records
        const srvRecords = await cloudflarehelper.getSrvRecordList(company.domain_zone_id, company.cloudf_token)
        await Promise.all(
            srvRecords.map((rec) => {
                return new Promise(async (resolve) => {
                    await cloudflarehelper
                        .deleteSrvRecord(company.domain_zone_id, rec.id, company.cloudf_token)
                        .catch((err) => {})
                    resolve()
                })
            })
        )

        // Delete from database
        await company.destroy()

        userLogger.info(`شرکت ${company.name} توسط ${req.user.username} حذف شد`)
        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.COMPANY.DELETE_SUCCESS)
    } catch (err) {
        console.error("Error deleting company: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
