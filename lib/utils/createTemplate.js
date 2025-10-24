const createTemplate = (templateName, channels, conn) => {
    for (let key of Object.keys(channels)) {
        let ch = channels[key]

        if (key == "priceChannels" || key == "weathersChannels") {
            for (let p of Object.keys(ch)) {
                if (!Object.values(ch[p]).every((value) => value != null && value != "")) {
                    delete channels[key][p]
                }
            }
        }

        if (key == "onClientsChannel") {
            channels[key].ignoreSgList = ch.ignoreSgList !== "" ? ch.ignoreSgList.split(",") : []
        }
        if (key == "onAdminsChannel") {
            channels[key].adminSgList = ch.adminSgList.split(",")
        }
        if (key == "autoRank") {
            channels[key].ranks = JSON.parse(ch?.ranks) || []
            channels[key].canUseIds = ch.canUseIds !== "" ? ch.canUseIds.split(",") : []
        }
        if (key == "autoCountry") {
            channels[key].countryList = JSON.parse(ch?.countryList) || []
            channels[key].ignoreSgList = ch.ignoreSgList !== "" ? ch.ignoreSgList.split(",") : []
        }
        if (key == "autoOs") {
            channels[key].ignoreSgList = ch.ignoreSgList !== "" ? ch.ignoreSgList.split(",") : []
        }
        if (key == "staffList") {
            channels[key] = channels[key].map((ch) => {
                ch.staffSgList = JSON.parse(ch.staffSgList) || []
                ch.clickable = ch.clickable == "on"
                return ch
            })
        }
        if (key == "idleTime") {
            channels[key].ignoreSgList = ch.ignoreSgList !== "" ? ch.ignoreSgList.split(",") : []
            channels[key].timeList = JSON.parse(ch?.timeList) || []
        }
        if (key == "deathRoomChannel") {
            channels[key].ignoreSgList = ch.ignoreSgList !== "" ? ch.ignoreSgList.split(",") : []
        }
        if (key == "multiRank") {
            channels[key].multiRanks = ch.multiRanks !== "" ? ch.multiRanks.split(",") : []
        }
        if (key == "moveRequest") {
            channels[key].canUseList = ch.canUseList !== "" ? ch.canUseList.split(",") : []
        }
        if (key == "jailChannels") {
            channels[key] = channels[key].map((ch) => {
                ch.time = ch.time > 1000 ? 1000 : ch.time
                return ch
            })
        }
    }

    return { templateName, conn, channels }
}

module.exports = createTemplate
