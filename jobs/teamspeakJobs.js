const cron = require("node-cron")

const { validateCronPattern, cronConfig } = require("../config/cron")
const Servers = require("../models/Servers")
const { createLogger } = require("../utils/logger")

const teamspeakHelper = require("../lib/teamspeak/teamspeakHelper")
const teamspeakQuery = require("../lib/teamspeak/teamspeakQuery")
const { setCache } = require("../services/redis/cacheService")

class Teamspeakjobs {
    constructor() {
        this.logger = createLogger("teamspeakJobs", "service")
    }

    startTeamspeakJobsCheck() {
        if (!validateCronPattern(cronConfig.teamspeakCheck, "teamspeakCheck")) {
            return
        }
        this.logger.info("Initializing teamspeak check jobs")

        const job = async () => {
            this.logger.info("Starting scheduled teamspeak check jobs...")

            await this.checkSlotsAndOnlines()
            await this.checkStatus()
        }

        cron.schedule(cronConfig.teamspeakCheck, job)
        job()
    }

    async checkStatus() {
        const serverList = await Servers.findAll()
        await Promise.all(serverList.map((s) => teamspeakHelper.status(s)))
    }

    async checkSlotsAndOnlines() {
        const serverList = await Servers.findAll()
        await Promise.all(
            serverList.map((s) => {
                return new Promise(async (resolve) => {
                    try {
                        const slots = await teamspeakQuery.getSlots(s.query_port, s.query_password)
                        const onlines = await teamspeakQuery.getOnlineClients(
                            s.server_port,
                            s.query_port,
                            s.query_password
                        )
                        await setCache(`teamspeak-${s.id}`, { onlines: onlines.length })

                        if (slots != s.slots) {
                            await teamspeakQuery.changeSlots(s.query_port, s.query_password, s.slots)
                        }
                    } catch {
                        await setCache(`teamspeak-${s.id}`, { status: "offline", onlines: 0 })
                    } finally {
                        resolve()
                    }
                })
            })
        )
    }
}

module.exports = Teamspeakjobs
