const CompanyList = require("../../../../models/CompanyList")
const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")

module.exports = async (req, res) => {
    try {
        const companyList = await CompanyList.findAll()

        return res.status(apiCodes.SUCCESS).json(companyList)
    } catch (err) {
        console.error("Get company list error: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
