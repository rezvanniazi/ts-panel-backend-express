const fs = require("fs")
const config = require("../../config")
const pathToParentDir = config.teamspeak.pathToParentDir

async function createSnapshotFile(snapshot, serverPort, queryPort) {
    return new Promise((resolve, reject) => {
        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth() + 1
        const day = today.getDate()
        const hour = today.getHours()
        const minute = today.getMinutes()
        const seconds = today.getSeconds()
        // 2023-12-12-100123
        const dateTimeString = `${year}-${month < 10 ? "0" : ""}${month}-${day < 10 ? "0" : ""}${day}-${
            hour < 10 ? "0" : ""
        }${hour}${minute < 10 ? "0" : ""}${minute}${seconds < 10 ? "0" : ""}${seconds}`
        const backupsPath = `${pathToParentDir}/Teamspeak-${serverPort}-${queryPort}/backups`
        const snapshotName = `${dateTimeString}`
        fs.writeFileSync(
            `${backupsPath}/${snapshotName}`,
            `snapshot_version=${snapshot.version} data=${snapshot.snapshot}`
        )
        resolve("Done")
    })
}

module.exports = createSnapshotFile
