const apiCodes = require("../../../../constants/apiCodes")
const responses = require("../../../../constants/responses")
const ServerPackages = require("../../../../models/ServerPackages")

exports.create = async (req, res) => {
    try {
        const { packageName, packageDescription, packageSlots, packageDays, packageAmount, packageForAdmin } = req.body

        const packageNameInUse = await ServerPackages.findOne({ where: { package_name: packageName } })
        if (packageNameInUse) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.PACKAGES.NAME_IN_USE)
        }

        const row = {
            package_name: packageName,
            package_description: packageDescription,
            package_days: packageDays,
            package_slots: packageSlots,
            package_amount: packageAmount,
            package_for_admin: packageForAdmin,
        }
        await ServerPackages.create(row)

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.PACKAGES.CREATE_SUCCESS)
    } catch (err) {
        console.error("Error creating server package: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.edit = async (req, res) => {
    try {
        const { packageId, packageDescription, packageSlots, packageDays, packageAmount, packageForAdmin } = req.body

        // Find package with requested id
        const package = await ServerPackages.findByPk(packageId)
        if (!package) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.PACKAGES.PACKAGE_NOT_FOUND)
        }

        const row = {
            package_description: packageDescription,
            package_days: packageDays,
            package_slots: packageSlots,
            package_amount: packageAmount,
            package_for_admin: packageForAdmin,
        }
        await package.update(row)

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.PACKAGES.EDIT_SUCCESS)
    } catch (err) {
        console.error("Error editing server package: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.delete = async (req, res) => {
    try {
        const { packageId } = req.body

        // Find package from db
        const package = await ServerPackages.findByPk(packageId)
        if (!package) {
            return res.status(apiCodes.BAD_REQUEST).json(responses.SETTINGS.PACKAGES.PACKAGE_NOT_FOUND)
        }

        await package.destroy()

        return res.status(apiCodes.SUCCESS).json(responses.SETTINGS.PACKAGES.DELETE_SUCCESS)
    } catch (err) {
        console.error("Error deleting server package: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}

exports.getAll = async (req, res) => {
    try {
        // Fetch package list from db
        const packageList = (await ServerPackages.findAll()) || []

        return res.status(apiCodes.SUCCESS).json(packageList)
    } catch (err) {
        console.error("Error getting server package list: ", err)

        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }
}
