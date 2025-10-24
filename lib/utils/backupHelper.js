const { exec } = require("child_process")
const mysql = require("mysql")
const { mysqlConfig } = require("../../config")

const connection = {
    host: mysqlConfig.host,
    user: mysqlConfig.username,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    charset: "utf8mb4_unicode_ci",
}

const backupFilePath = "./backup.sql"

const command = `mysqldump -h ${connection.host} -u ${connection.user} -p${connection.password} ${connection.database} > ${backupFilePath}`

const dump = () => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve([undefined, "err"])
                return
            }
            if (stderr) {
                resolve([undefined, "err"])
                return
            }
            console.log("Backup completed successfully!")
            resolve(["success", undefined])
        })
        // mysqldump(backupOptions)
        //     .then(() => {
        //         console.log("Backup completed successfully!")
        //         const dumpFilePath = "./backup.sql"

        //         // Read the .sql file
        //         let sql = fs.readFileSync(dumpFilePath, "utf8")

        //         // Remove NOFORMAT_WRAP
        //         sql.replace(/NOFORMAT_WRAP\("##(.+?)##"\)/g, "$1")
        //         console.log(sql)
        //         // Save the cleaned dump file
        //         fs.writeFileSync(dumpFilePath, sql, "utf8")

        //         resolve(["success", undefined])
        //     })
        //     .catch((err) => {
        //         console.error("Backup failed:", err)
        //         resolve([undefined, "err"])
        //     })
    })
}

const deploy = (data) => {
    return new Promise((resolve, reject) => {
        const pool = mysql.createConnection({ ...connection, multipleStatements: true })

        pool.query(data, [], (err, res) => {
            if (err) {
                console.log("deploy error", err)
                resolve([undefined, err])
            } else {
                resolve(["Success", undefined])
            }
        })
        pool.end()
    })
}

module.exports = { dump, deploy }
