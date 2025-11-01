const apiCodes = require("../../../constants/apiCodes")
const Users = require("../../../models/Users")
const CompanyList = require("../../../models/CompanyList")

const getCredentials = async (req, res) => {
    const { id } = req.user

    let credentials = await Users.findByPk(id, { raw: true })
    const company = await CompanyList.findOne({ where: { name: credentials.company_name }, raw: true })

    if (company) {
        credentials.companyDomainName = company.domain_name
        credentials.companyIp = company.domain_ip
    }

    delete credentials.password

    return res.status(apiCodes.SUCCESS).json(credentials)
}

module.exports = getCredentials
