const { sequelize } = require("../../../config/database")
const apiCodes = require("../../../constants/apiCodes")
const responses = require("../../../constants/responses")
const ServerPackages = require("../../../models/ServerPackages")
const Servers = require("../../../models/Servers")
const Users = require("../../../models/Users")
const { createLogger } = require("../../../utils/logger")

const extendServer = async (req, res) => {
    const transaction = await sequelize.transaction()
    const { serverId } = req.body

    const server = await Servers.findByPk(serverId)
    const user = await Users.findByPk(req.user.id)

    if (!server) {
        return res.status(apiCodes.NOT_FOUND).json(responses.TEAMSPEAK.NOT_FOUND)
    }
    if (req.user.scope !== "admin" && server.author !== req.user.username) {
        return res.status(apiCodes.FORBIDDEN).json(responses.COMMON.ACCESS_DENIED)
    }

    const package = await ServerPackages.findOne({ where: { package_name: server.package_name } })
    if (!package) {
        return res.status(apiCodes.PACKAGE_NOT_FOUND).json(responses.TEAMSPEAK.PACKAGE_NOT_FOUND)
    }

    if (!package.package_days || package.package_days == 0) {
        return res.status(apiCodes.UNLIMIT_PACKAGE_EXTEND).json(responses.TEAMSPEAK.EXTEND_UNLIMITED)
    }

    const serverLogger = createLogger("teamspeak", serverId)
    const userLogger = createLogger("user", req.user.id)

    if (server.expires) {
        const today = new Date()
        let expires = new Date(server.expires)
        if (expires < today) {
            expires = today
        }
        expires.setDate(expires.getDate() + package.package_days)

        serverLogger.info(`${package.package_days} روز به سرور توسط ${req.user.username} اضافه شد`)

        server.expires = expires
        await server.save({ transaction })
    }
    try {
        await user.subtractBalance(package.package_amount, transaction)
        userLogger.info(`مقدار ${package.package_amount} از حساب کاربر بابت تمدید سرور کسر شد`)

        await transaction.commit()
    } catch (err) {
        console.log(err)
        await transaction.rollback()
        return res.status(apiCodes.INTERNAL_SERVER_ERROR).json(responses.COMMON.INTERNAL_SERVER_ERROR)
    }

    return res.status(apiCodes.SUCCESS).json(responses.TEAMSPEAK.EXTENDED)
}

module.exports = extendServer
