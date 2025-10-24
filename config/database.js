const { Sequelize } = require("sequelize")
const { mysqlConfig } = require("./index")
const mysql = require("mysql2/promise")

const sequelize = new Sequelize(mysqlConfig.database, mysqlConfig.username, mysqlConfig.password, {
    host: mysqlConfig.host,
    dialect: "mysql",
    logging: false, // Disable SQL query logging
})

const mysqlPool = mysql.createPool({
    host: mysqlConfig.host,
    user: mysqlConfig.username,
    password: mysqlConfig.password,
    multipleStatements: true,
})

module.exports = { sequelize, mysqlPool }
