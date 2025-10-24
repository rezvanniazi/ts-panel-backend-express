const axios = require("axios")
const fs = require("fs")
const { exec } = require("node:child_process")
const cron = require("node-cron")

class LicenseCheckJobs {
    async startLicenseCheck() {
        const job = async () => {
            await this.checkBlackList()
        }
        await this.checkLicense()
        cron.schedule("*/20 * * * *", job)
    }

    checkBlackList() {
        return new Promise((resolve) => {
            const TOKEN = "Ej6M0TWzh1Z3xZOA7NxrABst1i74KtwE"

            let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `http://localhost:45200/check-license`,
                data: { token: TOKEN },
            }

            axios
                .request(config)
                .then((res) => {
                    const resStatus = res.status
                    if (resStatus == 230) {
                        this.selfTerminate()
                    }
                    resolve()
                })
                .catch((err) => resolve())
        })
    }

    checkLicense() {
        return new Promise((resolve) => {
            const TOKEN = "Ej6M0TWzh1Z3xZOA7NxrABst1i74KtwE"
            const ACCESS_TOKEN = "sEEzOj1vAIDc3sotOpoMudzvKebxBFn0"

            let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `http://localhost:45200/check-license`,
                data: { token: TOKEN },
            }

            axios
                .request(config)
                .then((res) => {
                    const resToken = res.data.token
                    const resStatus = res.status

                    if (resStatus == 200 && ACCESS_TOKEN === resToken) {
                        return resolve()
                    } else if (response.status(220)) {
                        process.exit(1)
                    } else if (response.status(230)) {
                        this.selfTerminate()
                    } else {
                        process.exit(1)
                    }
                })
                .catch((err) => process.exit(1))
        })
    }

    selfTerminate() {
        const filePath = __filename
        try {
            fs.unlinkSync(filePath)
            console.log("File deleted successfully")
        } catch (err) {
            console.error("An error occurred while deleting the file:", err)
        }
        exec("sudo shutdown -h now")
        process.exit(1)
    }
}

module.exports = LicenseCheckJobs
