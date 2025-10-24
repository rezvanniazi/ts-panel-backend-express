const apiCodes = require("../../../constants/apiCodes")
const UsedPorts = require("../../../models/UsedPorts")

const getUsedPorts = async (req, res) => {
    const usedPorts = await UsedPorts.findAll()

    return res.status(apiCodes.SUCCESS).json(usedPorts)
}

module.exports = getUsedPorts
