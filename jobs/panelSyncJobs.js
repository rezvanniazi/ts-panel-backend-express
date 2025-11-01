const cron = require("node-cron")

const { validateCronPattern, cronConfig } = require("../config/cron")
const ManagerBotPanels = require("../models/ManagerBotPanels")
const TsManagerBots = require("../models/TsManagerBots")
const { createLogger } = require("../utils/logger")

const audioBotHelper = require("../lib/audioBot/audioBotHelper")
const managerBotApis = require("../lib/managerBot/ManagerBotPanel")
const MusicBotPanels = require("../models/MusicBotPanels")
const AudioBots = require("../models/AudioBots")
const Ranksystems = require("../models/Ranksystems")
const RanksystemSettings = require("../models/RanksystemSettings")
const { RanksystemPanel } = require("../lib/ranksystem/RanksystemPanel")

class PanelSyncJobs {
    constructor() {
        this.logger = createLogger("panelSyncJobs", "service")
        this.jobs = []
    }

    startPanelSyncCheck() {
        if (!validateCronPattern(cronConfig.panelSyncCheck, "panelSyncCheck")) {
            return
        }

        this.logger.info("Initializing panelSync check jobs")

        const job = async () => {
            this.logger.info("starting scheduled panelsync check")

            await this.checkAudiobotPanels()
            await this.checkManagerbotPanels()
            await this.checkRanksystemPanels()
        }

        cron.schedule(cronConfig.panelSyncCheck, job)

        job()
    }

    async checkManagerbotPanels() {
        const panels = await ManagerBotPanels.findAll()
        const bots = await TsManagerBots.findAll()

        await Promise.all(
            panels.map((p) => {
                return new Promise(async (resolve) => {
                    await managerBotApis
                        .list({ panel: p })
                        .then(async (res) => {
                            if (!res.ok) {
                                throw new Error({ code: "ECONNREFUSED" })
                            }
                            const panelBotList = res?.data?.items
                            if (!res.ok) {
                                throw new Error({ code: "ECONNREFUSED" })
                            }

                            for (let botInPanel of panelBotList) {
                                const botInDb = bots.find((b) => b.template_name == botInPanel.templateName)

                                if (botInDb) {
                                    botInDb.status = botInPanel.connected ? "online" : "offline"
                                    await botInDb.save()
                                }
                            }

                            await p.update({ status: "online", in_use_count: panelBotList.length })
                            resolve()
                        })
                        .catch(async (err) => {
                            const errorCode = err.error
                            if (errorCode === "SOCKET_NOT_CONNECTED") {
                                this.logger.error(`Manager Panel ${p.host} is offline`)
                            }

                            const panelsBotsInDb = bots.filter((b) => b.panel_id == p.id)
                            panelsBotsInDb.forEach(async (b) => b.update({ status: "offline" }))

                            p.status = "offline"
                            await p.save()
                            resolve()
                        })
                })
            })
        )
    }

    async checkAudiobotPanels() {
        const panels = await MusicBotPanels.findAll()
        const bots = await AudioBots.findAll()

        await Promise.all(
            panels.map((p) => {
                return new Promise(async (resolve) => {
                    await audioBotHelper
                        .getBotList({ panel: p })
                        .then(async (panelBotList) => {
                            for (let botInPanel of panelBotList) {
                                const botInDb = bots.find((b) => b.template_name == botInPanel.Name)
                                if (botInDb) {
                                    const status =
                                        botInPanel.Status == 2
                                            ? "connected"
                                            : botInPanel.Status == 1
                                            ? "connecting"
                                            : "offline"
                                    botInDb.status = status
                                    await botInDb.save()
                                }
                            }

                            await p.update({ status: "online", in_use_count: panelBotList.length })
                            resolve()
                        })
                        .catch(async (err) => {
                            if (err.code == "ECONNREFUSED") {
                                this.logger.error(`Music Panel ${err.address}:${err.port} is offline`)
                            }

                            const panelsBotsInDb = bots.filter((b) => b.panel_id == p.id)
                            panelsBotsInDb.forEach(async (b) => b.update({ status: "offline" }))

                            p.status = "offline"
                            await p.save()

                            resolve()
                        })
                })
            })
        )
    }

    async checkRanksystemPanels() {
        const bots = await Ranksystems.findAll()

        const panelInstance = RanksystemPanel.getPanel()

        try {
            const { data: panelBotList } = await panelInstance.getBotList()
            for (let botInPanel of panelBotList) {
                const botInDb = bots.find((b) => b.template_name === botInPanel.templateName)
                if (botInDb) {
                    botInDb.status = botInPanel.status
                    await botInDb.save()
                }
            }
        } catch (err) {
            if (err.error === "SOCKET_NOT_CONNECTED") {
                this.logger.error(`Ranksystem Panel ${panelInstance.address} is offline`)
            } else {
                console.log(err)
            }

            bots.forEach(async (b) => b.update({ status: "offline" }))
        }
    }
}

module.exports = PanelSyncJobs
