const os = require("os")
const si = require("systeminformation")

class ServerUsageJob {
    constructor(io) {
        this.io = io
    }

    startServerUsageCheck() {
        const check = async () => {
            if (this.io.engine.clientsCount <= 0) return

            const diskUsage = await this.getDiskUsage("/")
            const cpuUsage = this.getCpuUsage()
            const memoryUsage = this.getMemoryUsage()
            this.io.emit("serverUsage", {
                diskUsage,
                cpuUsage,
                memoryUsage,
            })
        }

        check()
        setInterval(check, 2000)
    }

    formatBytes(bytes) {
        if (bytes < 1024 * 1024) {
            // Less than 1 MB
            return `${(bytes / 1024).toFixed(2)} KB`
        } else if (bytes < 1024 * 1024 * 1024) {
            // Less than 1 GB
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
        } else {
            // 1 GB or more
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
        }
    }

    getDiskUsage() {
        return new Promise(async (resolve) => {
            try {
                const disks = await si.fsSize()
                const disk = disks[0]

                resolve({
                    total: this.formatBytes(disk.size),
                    used: this.formatBytes(disk.used),
                    percent: disk.use,
                })
            } catch (error) {
                console.error("Error fetching disk usage:", error)
                resolve({
                    total: 0,
                    used: 0,
                    percent: 0,
                })
            }
        })
    }

    getCpuUsage() {
        const cpus = os.cpus()
        const coreCount = cpus.length

        let totalIdle = 0
        let totalTick = 0

        // Sum up idle and total ticks for all cores
        cpus.forEach((cpu) => {
            totalIdle += cpu.times.idle
            totalTick += Object.values(cpu.times).reduce((acc, time) => acc + time, 0)
        })

        // Calculate average CPU usage
        const averageUsage = (((totalTick - totalIdle) / totalTick) * 100).toFixed(2)

        return { coreCount, percent: averageUsage }
    }

    getMemoryUsage() {
        const totalMemory = os.totalmem()
        const usedMemory = totalMemory - os.freemem()

        return {
            totalMemory: this.formatBytes(totalMemory),
            usedMemory: this.formatBytes(usedMemory),
            percent: ((usedMemory / totalMemory) * 100).toFixed(2),
        }
    }
}

module.exports = ServerUsageJob
