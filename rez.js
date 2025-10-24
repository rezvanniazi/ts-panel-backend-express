const path = require("path")

const fs = require("fs").promises

const RESELLER_LOG_TYPES = ["managerBot", "teamspeak", "audiobot"]

const scope = "reseller"

async function readDirectory(readPath) {
    try {
        const tree = []

        let logsFolders

        if (scope === "reseller") {
            logsFolders = RESELLER_LOG_TYPES
        } else {
            logsFolders = await fs.readdir(readPath)
        }

        for (let folder of logsFolders) {
            const logFiles = await fs.readdir(path.join(readPath, folder))

            tree.push({ folderName: folder, files: logFiles })
        }

        console.log("All items:", tree)
        return tree
    } catch (error) {
        console.error("Error reading directory:", error)
    }
}

readDirectory(path.join(process.cwd(), "logs"))
