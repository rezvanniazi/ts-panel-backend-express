const { Raw } = require("teamspeak-query")

function transformTeamspeakResponse(response) {
    // If response is already an array, return it directly
    if (Array.isArray(response)) {
        return response
    }

    // Handle single object case
    const propertyKeys = Object.keys(response).filter((key) => key !== "raw")

    // Check if this is an array-like response (some properties are arrays)
    const isArrayLike = propertyKeys.some((key) => Array.isArray(response[key]))

    if (!isArrayLike) {
        // Single object - wrap in array for consistency
        return [response]
    }

    // Handle array-like response (original transformation logic)
    const firstArrayKey = propertyKeys.find((key) => Array.isArray(response[key]))
    const objectCount = response[firstArrayKey].length
    const result = []

    for (let i = 0; i < objectCount; i++) {
        const obj = {}
        for (const key of propertyKeys) {
            obj[key] = Array.isArray(response[key]) ? response[key][i] : response[key]
        }
        result.push(obj)
    }

    return result
}

const serverDataFetch = async ({ host, username, password, queryPort, serverPort }) => {
    const connection = new Raw({ host: host, port: queryPort, keepAlive: false })
    try {
        await connection.connectSocket()

        // Close connection if didn't respond for 5 seconds
        connection.sock.setTimeout(5000, () => connection.disconnect())

        await connection.send("login", username, password)

        await connection.send("use", { port: serverPort })

        await connection.throttle.set("enable", false)

        const channelList = transformTeamspeakResponse(await connection.send("channellist").catch(() => []))
            .sort((a, b) => a.channel_order - b.channel_order)
            .map((ch) => ({
                value: ch.cid,
                label: ch.channel_name,
            }))

        const sgList = transformTeamspeakResponse(await connection.send("servergrouplist").catch(() => []))
            .sort((a, b) => a.sortid - b.sortid)
            .map((sg) => ({
                value: sg.sgid,
                label: sg.name,
            }))

        const cgList = transformTeamspeakResponse(await connection.send("channelgrouplist").catch(() => []))
            .sort((a, b) => a.sortid - b.sortid)
            .map((sg) => ({
                value: sg.cgid,
                label: sg.name,
            }))

        const iconList = transformTeamspeakResponse(
            await connection.send("ftgetfilelist", { cid: 0, cpw: "", path: "/icons/" }).catch(() => [])
        ).map((i) => ({ value: i.name.substring(5), label: i.name.substring(5) }))

        await connection.disconnect()

        return { channelList, sgList, iconList, cgList }
    } catch (err) {
        await connection.disconnect()
        console.log(err)
        if (err?.code === "ECONNREFUSED") {
            throw new Error("ECONNREFUSED")
        } else if (err?.id == 520) {
            throw new Error("INCORRECT_LOGIN")
        } else {
            throw new Error("UNKNOWN")
        }
    }
}

module.exports = serverDataFetch
