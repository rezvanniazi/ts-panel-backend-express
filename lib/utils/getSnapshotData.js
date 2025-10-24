const fs = require("fs")
const config = require("../../config")
const pathToParentDir = config.teamspeak.pathToParentDir

async function getSnapshotData(snapshotName, serverPort, queryPort) {
    return new Promise(async (resolve, reject) => {
        const backupsPath = `${pathToParentDir}/Teamspeak-${serverPort}-${queryPort}/backups`
        let snapshot
        try {
            snapshot = fs.readFileSync(`${backupsPath}/${snapshotName}`)
        } catch (err) {
            console.error(err)
        }
        resolve(snapshot.toString())
        return
    })
}

module.exports = getSnapshotData
