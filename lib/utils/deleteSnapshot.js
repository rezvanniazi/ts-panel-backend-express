const fs = require("fs")
const config = require("../../config")
const pathToParentDir = config.teamspeak.pathToParentDir

async function deleteSnapshot(server, snapshotName) {
    return new Promise((resolve, reject) => {
        fs.rm(
            `${pathToParentDir}/Teamspeak-${server.server_port}-${server.query_port}/backups/${snapshotName}`,
            { recursive: true },
            (err) => {
                if (err) {
                    console.error(err)
                    resolve()
                } else {
                    console.log("Folder Deleted")
                    resolve()
                }
            }
        )
    })
}

module.exports = deleteSnapshot
