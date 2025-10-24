async function convertNetStringToArray(string) {
    const bans = string.split("|").map((banString) => {
        const banObj = {}
        banString.split(" ").forEach((propString) => {
            const [key, value] = propString.split("=")
            banObj[key] = value
        })
        return banObj
    })
    return bans
}

module.exports = convertNetStringToArray
