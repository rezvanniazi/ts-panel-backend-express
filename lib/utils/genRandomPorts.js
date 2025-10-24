const { getUsedPorts } = require("../db-query/db-query")

async function portIsInUse(port, usedPorts) {
    usedPorts = await getUsedPorts()
    if (usedPorts.includes(port)) {
        return true
    }
    return false
}

async function genRandomPorts(length) {
    return new Promise(async (resolve, reject) => {
        let ports = []
        for (let i = 0; i < length; i++) {
            const min = Math.ceil(4000)
            const max = Math.floor(7000)
            let port
            while (true) {
                port = Math.floor(Math.random() * (max - min + 1)) + min
                if (!(await portIsInUse(port))) {
                    break
                }
            }
            ports.push(port)
        }
        resolve(ports)
    })
}

module.exports = genRandomPorts
