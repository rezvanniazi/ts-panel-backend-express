const fs = require("fs")
const config = require("../../config")
const pathToParentDir = config.teamspeak.pathToParentDir

async function getSnapshotList(serverPort, queryPort) {
    return new Promise(async (resolve, reject) => {
        const backupsPath = `${pathToParentDir}/Teamspeak-${serverPort}-${queryPort}/backups`
        let snapshotList
        try {
            snapshotList = fs.readdirSync(`${backupsPath}`)
        } catch (err) {
            snapshotList = []
            console.error(err)
        }
        resolve(snapshotList)
        return
    })
}

module.exports = getSnapshotList
