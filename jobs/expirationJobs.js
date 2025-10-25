const cron = require("node-cron")

const { Op } = require("sequelize")
const { validateCronPattern, cronConfig } = require("../config/cron")
const Servers = require("../models/Servers")
const teamspeakHelper = require("../lib/teamspeak/teamspeakHelper")
const audioBotHelper = require("../lib/audioBot/audioBotHelper")
const managerBotApis = require("../lib/managerBot/ManagerBotPanel")

const { createLogger } = require("../utils/logger")
const Users = require("../models/Users")
const ServerPackages = require("../models/ServerPackages")
const TsManagerBots = require("../models/TsManagerBots")
const ManagerBotPanels = require("../models/ManagerBotPanels")
const calculatePermissions = require("../lib/utils/calculatePermissions")
const AudioBots = require("../models/AudioBots")
const Permissions = require("../models/Permissions")

class ExpirationJobs {
    constructor() {
        this.logger = createLogger("expirationJobs", "service")
        this.jobs = []
    }

    startExpirationCheck() {
        if (!validateCronPattern(cronConfig.expirationCheck, "expirationCheck")) {
            return
        }
        this.logger.info("Initializing expiration check jobs")

        const job = async () => {
            this.logger.info("Starting scheduled expiration check...")

            await this.checkTeamspeakExpirations()
            await this.checkAudiobotExpirations()
            await this.checkManagerBotExpirations()
        }
        cron.schedule(cronConfig.expirationCheck, job)

        job()
    }

    async checkTeamspeakExpirations() {
        function renew(server) {
            return new Promise(async (resolve, reject) => {
                if (!server.autorenew) {
                    return reject()
                }
                const author = await Users.findOne({ where: { username: server.author } })
                const pkg = await ServerPackages.findOne({ where: { package_name: server.package_name } })
                if (!pkg || !author) {
                    return reject()
                }
                try {
                    await author.subtractBalance(pkg.package_amount)
                } catch (err) {
                    return reject()
                }

                const expires = new Date()
                expires.setDate(expires.getDate() + pkg.package_days)

                await server.update({ expires })
                resolve()
            })
        }

        try {
            const expiredServers = await Servers.findAll({
                where: {
                    expires: {
                        // Lower then current date
                        [Op.lt]: new Date(),
                    },
                    state: "active",
                },
            })
            await Promise.all(
                expiredServers.map(async (s) => {
                    await renew(s).catch(async () => {
                        await teamspeakHelper.stop(s)
                        s.state = "suspended"
                        await s.save()
                    })
                })
            )
        } catch (err) {
            this.logger.error("Couldn't fetch expired servers")
        }
    }

    async checkAudiobotExpirations() {
        async function renew(bot) {
            if (!bot.autorenew) {
                throw new Error()
            }

            const author = await Users.findOne({ where: { username: bot.bot_owner } })
            const pkg = await BotPackages.findOne({ where: { package_name: bot.package_name } })
            if (!pkg || !author) {
                throw new Error("Package or author not found")
            }

            await author.subtractBalance(pkg.package_amount)
            const expires = new Date()
            expires.setDate(expires.getDate() + pkg.package_days)

            await bot.update({ expires })
        }

        const bots = await AudioBots.findAll({
            where: {
                expires: {
                    // Lower then current date
                    [Op.lt]: new Date(),
                },
                state: "active",
            },
        })

        await Promise.all(
            bots.map(async (b) => {
                try {
                    renew(b)
                } catch (err) {
                    const panel = await MusicBotPanels.findOne({ where: { id: b.panel_id } })
                    if (panel && panel.status == "online") {
                        await audioBotHelper.disconnect({
                            templateName: b.template_name,
                            panel: panel,
                        })
                    }

                    b.state = "suspended"
                    b.status = "offline"
                    await b.save()
                }
            })
        )
    }

    async checkManagerBotExpirations() {
        async function renew(bot) {
            if (!bot.autorenew) {
                throw new Error()
            }

            const author = await Users.findOne({ where: { username: bot.author } })
            const permissions = await Permissions.findAll({ raw: true })

            if (!permissions || !author) {
                throw new Error("Permissions or author not found")
            }
            const amount = calculatePermissions(permissions, bot.permissions)
            await author.subtractBalance(amount)

            const expires = new Date()
            expires.setDate(expires.getDate() + 30)

            bot.expires = expires
            await b.save()
        }

        const bots = await TsManagerBots.findAll({
            where: {
                expires: {
                    [Op.lt]: new Date(),
                },
                state: "active",
            },
        })

        await Promise.all(
            bots.map(async (b) => {
                try {
                    renew(b)
                } catch (err) {
                    const panel = await ManagerBotPanels.findOne({ where: { id: b.panel_id } })
                    if (panel && panel.status == "online") {
                        await managerBotApis.delete({ panel, data: { templateName: b.template_name } })
                    }

                    b.state = "suspended"
                    b.status = "offline"
                    await b.save()
                }
            })
        )
    }
}

module.exports = ExpirationJobs
