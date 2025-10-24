require("dotenv").config()

module.exports = {
    port: process.env.PORT || 3000,
    secret: process.env.JWT_SECRET,
    mysqlConfig: {
        host: process.env.MYSQL_HOST,
        database: process.env.MYSQL_DATABASE,
        username: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
    },
    cronConfig: {
        expirationCheck: process.env.EXPIRATION_CHECK,
        panelSyncCheck: process.env.PANEL_SYNC_CHECK,
        teamspeakCheck: process.env.TEAMSPEAK_CHECK,
    },

    teamspeak: {
        pathToParentDir: process.env.PATH_TO_PARENT_DIR,
    },
}
