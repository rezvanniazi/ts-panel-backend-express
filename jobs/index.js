const ExpirationJobs = require("./expirationJobs")
const LicenseCheckJobs = require("./licenseCheckJobs")
const PanelSyncJobs = require("./panelSyncJobs")
const TeamspeakJobs = require("./teamspeakJobs")
const ServerUsageJob = require("./serverUsageJob")

class JobManager {
    constructor(io) {
        this.expirationJobs = new ExpirationJobs()
        this.panelSyncJobs = new PanelSyncJobs()
        this.teamspeakJobs = new TeamspeakJobs()
        this.serverUsageJob = new ServerUsageJob(io)
        this.licenseCheckJobs = new LicenseCheckJobs()
    }

    startAlljobs() {
        this.expirationJobs.startExpirationCheck()
        this.panelSyncJobs.startPanelSyncCheck()
        this.teamspeakJobs.startTeamspeakJobsCheck()
        this.serverUsageJob.startServerUsageCheck()
        this.licenseCheckJobs.startLicenseCheck()
    }
}

module.exports = JobManager
