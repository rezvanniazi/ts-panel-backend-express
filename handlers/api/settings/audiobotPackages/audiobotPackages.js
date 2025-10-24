const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const BotPackages = require("../../../../models/BotPackages")

exports.create = async (req, res) => {
    try {
        const { packageName, packageDescription, packageDays, packageAmount, packageForAdmin, packageType } = req.body

        const packageNameInUse = await BotPackages.findOne({ where: { package_name: packageName } })
        if (packageNameInUse) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.PACKAGES.NAME_IN_USE)
        }

        const row = {
            package_name: packageName,
            package_description: packageDescription,
            package_days: packageDays,
            package_amount: packageAmount,
            package_for_admin: packageForAdmin,
            package_bot_type: packageType,
        }
        await BotPackages.create(row)

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.PACKAGES.CREATE_SUCCESS)
    } catch (err) {
        console.error("Error creating audiobot package: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.edit = async (req, res) => {
    try {
        const { packageId, packageName, packageDescription, packageDays, packageAmount, packageForAdmin, packageType } =
            req.body

        // Find package with requested id
        const package = await BotPackages.findByPk(packageId)
        if (!package) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.PACKAGES.PACKAGE_NOT_FOUND)
        }

        const row = {
            package_name: packageName,
            package_description: packageDescription,
            package_days: packageDays,
            package_amount: packageAmount,
            package_for_admin: packageForAdmin,
            package_bot_type: packageType,
        }
        await package.update(row)

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.PACKAGES.EDIT_SUCCESS)
    } catch (err) {
        console.error("Error editing audiobot package: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.delete = async (req, res) => {
    try {
        const { packageId } = req.body

        // Find package from db
        const package = await BotPackages.findByPk(packageId)
        if (!package) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.PACKAGES.PACKAGE_NOT_FOUND)
        }

        await package.destroy()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.PACKAGES.DELETE_SUCCESS)
    } catch (err) {
        console.error("Error deleting audiobot package: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.getAll = async (req, res) => {
    try {
        // Fetch package list from db
        const packageList = (await BotPackages.findAll()) || []

        return res.status(apiCodes.SUCCESS).json(packageList)
    } catch (err) {
        console.error("Error getting audiobot package list: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
