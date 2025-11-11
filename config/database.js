const { Sequelize } = require("sequelize")
const { mysqlConfig } = require("./index")
const mysql = require("mysql2/promise")

const sequelize = new Sequelize(mysqlConfig.database, mysqlConfig.username, mysqlConfig.password, {
    host: mysqlConfig.host,
    dialect: "mysql",
    logging: false, // Disable SQL query logging
    pool: {
        max: 20, // Increase maximum connections
        min: 5, // Minimum connections
        acquire: 60000, // Increase acquire timeout (ms) - was probably 30000
        idle: 30000, // Connection idle time
        evict: 15000, // How often to check for idle connections
    },
    retry: {
        max: 3, // Retry failed queries
    },
})

const mysqlPool = mysql.createPool({
    host: mysqlConfig.host,
    user: mysqlConfig.username,
    password: mysqlConfig.password,
    multipleStatements: true,
})

module.exports = { sequelize, mysqlPool }
