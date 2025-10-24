const cron = require("node-cron")
const { cronConfig } = require("./index")

const validateCronPattern = (pattern, jobName) => {
    if (!cron.validate(pattern)) {
        console.log(`Invalid cron pattern for ${jobName}: ${pattern}`)
        return false
    }
    return true
}

module.exports = { cronConfig, validateCronPattern }
