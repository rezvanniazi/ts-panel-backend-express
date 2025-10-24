const axios = require("axios")
const AudioBots = require("../../models/AudioBots")

const uriEncoder = (uri) => {
    const encodedUri = encodeURIComponent(decodeURIComponent(uri)).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    )
    return encodedUri
}

function audioBotApiHelper(endpoint, panel) {
    return new Promise((resolve, reject) => {
        try {
            let config = {
                method: "get",
                maxBodyLength: Infinity,
                url: panel?.host + endpoint,
                headers: {
                    Accept: "application/json",
                    Authorization: "Basic " + Buffer.from(panel?.token).toString("base64"),
                },
            }

            axios
                .request(config)
                .then((res) => {
                    resolve([res.data, null])
                })
                .catch((err) => {
                    // console.log(err)
                    resolve([null, err])
                })
        } catch (err) {
            console.log(err)
        }
    })
}

exports.create = ({ type, templateName, address, botName, defaultChannel, channelCommanderIsOn, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/settings/create/${templateName}`, panel)

            if (err) {
                return reject()
            }

            await this.changeConnectAddress({ templateName, address, panel })
            await this.changeConnectName({ templateName, botName, panel })
            await this.changeConnectChannel({ templateName, defaultChannel, panel })
            await audioBotApiHelper(`/api/settings/bot/set/${templateName}/generate_status_avatar/false`, panel)
            await audioBotApiHelper(`/api/settings/bot/set/${templateName}/set_status_description/false`, panel)

            await this.connect({ templateName, panel })

            if (channelCommanderIsOn) {
                await this.turnOnChannelCommander({ templateName, panel })
            } else {
                await this.turnOffChannelCommander({ templateName, panel })
            }

            if (type === "youtube") {
                await audioBotApiHelper(
                    `/api/bot/template/${templateName}(/alias/add/yt/${uriEncoder("!search from youtube (!param 0)")})`,
                    panel
                )
                await audioBotApiHelper(
                    `/api/bot/template/${templateName}(/alias/add/ytp/${uriEncoder(
                        "!x (!search from youtube (!param 0)) (!search play 0)"
                    )})`,
                    panel
                )
                await audioBotApiHelper(
                    `/api/bot/template/${templateName}(/alias/add/ytq/${uriEncoder(
                        "!x (!search from youtube (!param 0)) (!search add  0)"
                    )})`,
                    panel
                )
            } else {
                await audioBotApiHelper(`/api/bot/template/${templateName}/(/list/create/Radio/Radio)`, panel)
            }

            return resolve("success")
        } catch (err) {
            return reject(err)
        }
    })
}

exports.connect = ({ templateName, panel, playing }) => {
    return new Promise(async (resolve, reject) => {
        async function checkOnlineStatus() {
            const [res, err] = await audioBotApiHelper(`/api/bot/info/template/${templateName}`, panel)

            let botStatus =
                res.Status && res.Status == 1 ? "connecting" : res.Status && res.Status == 2 ? "connected" : "offline"

            const botInDb = await AudioBots.findOne({ where: { template_name: templateName } })
            if (botInDb) {
                await botInDb.update({ status: botStatus })
            }
        }

        try {
            const [res, err] = await audioBotApiHelper(`/api/bot/connect/template/${templateName}`, panel)

            // async function playMusic(templateName, panel, playing) {
            //     const radio = await radioDb.find({ name: playing })
            //     if (radio) {
            //         await exports.radio.change({ templateName, panel, radioUrl: radio.url })
            //     }
            // }
            // if (playing) {
            //     setTimeout(() => playMusic(templateName, panel, playing), 10000)
            // }
            if (res?.Status == 2) {
                return resolve("connected")
            }

            if (res?.Status == 1) {
                setTimeout(checkOnlineStatus, 5000)
                return resolve("connecting")
            } else {
                return resolve("offline")
            }
        } catch (err) {
            console.log(err)
            return resolve("offline")
        }
    })
}

exports.disconnect = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            await audioBotApiHelper(`/api/bot/template/${templateName}/(/bot/disconnect)`, panel)

            return resolve("success")
        } catch (err) {
            console.log(err)
            return reject(err)
        }
    })
}

exports.delete = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            await audioBotApiHelper(`/api/bot/template/${templateName}/(/bot/disconnect)`, panel)
            await new Promise((resolve) => setTimeout(resolve, 1000))

            await audioBotApiHelper(`/api/settings/delete/${templateName}`, panel)

            return resolve("success")
        } catch (err) {
            return reject(err)
        }
    })
}

exports.turnOnChannelCommander = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            ;[res, err] = await audioBotApiHelper(`/api/bot/info/template/${templateName}`, panel)

            if (err) {
                return resolve()
            }

            if (res.Status == 2 && res?.Id !== null) {
                await audioBotApiHelper(`/api/bot/use/${res.Id}/(/bot/commander/on)`, panel).catch((err) => {
                    console.log(`Permission Denied for ${templateName} to turn on channel commander`)
                })
            }
            return resolve("success")
        } catch (err) {
            return reject(err)
        }
    })
}

exports.turnOffChannelCommander = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/bot/info/template/${templateName}`, panel)

            if (err) {
                return resolve()
            }

            if (res.Status == 2 && res?.Id !== null) {
                await audioBotApiHelper(`/api/bot/use/${res.Id}/(/bot/commander/off)`, panel)
            }
            return resolve("success")
        } catch (err) {
            return reject(err)
        }
    })
}

exports.getStatus = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/bot/info/template/${templateName}`, panel)

            if (err) {
                return reject()
            }

            switch (res.Status) {
                case 0:
                    resolve("offline")
                case 1:
                    resolve("connecting")
                case 2:
                    resolve("connected")
            }
            return
        } catch (err) {
            return reject(err)
        }
    })
}

exports.getVolume = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/bot/template/${templateName}/(/volume)`, panel)

            if (err) {
                return reject()
            }
            return resolve(res?.Value || 0)
        } catch (err) {
            return reject(err)
        }
    })
}

exports.changeConnectName = ({ templateName, botName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            await audioBotApiHelper(`/api/settings/bot/set/${templateName}/connect.name/${uriEncoder(botName)}`, panel)
            await audioBotApiHelper(
                `/api/bot/template/${templateName}/(/bot/name/${uriEncoder(botName)})`,
                panel
            ).catch(() => {})

            resolve()
            return
        } catch (err) {
            return reject(err)
        }
    })
}

exports.changeConnectAddress = ({ templateName, address, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(
                `/api/settings/bot/set/${templateName}/connect.address/${uriEncoder(address)}`,
                panel
            )

            if (err) {
                return resolve()
            }

            resolve()
            return
        } catch (err) {
            return reject(err)
        }
    })
}

exports.changeConnectChannel = ({ templateName, defaultChannel, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let defChannel = isFinite(defaultChannel) ? `/${defaultChannel}` : defaultChannel

            const [res, err] = await audioBotApiHelper(
                `/api/settings/bot/set/${templateName}/connect.channel/${uriEncoder(defChannel)}`,
                panel
            )

            if (err) {
                return resolve()
            }

            resolve(res)
            return
        } catch (err) {
            return reject(err)
        }
    })
}

exports.turnOnAutoStart = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/settings/bot/set/${templateName}/run/true`, panel)

            if (err) {
                return resolve()
            }

            resolve(res)
            return
        } catch (err) {
            return reject(err)
        }
    })
}

exports.changeVolume = ({ templateName, panel, volume }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/bot/template/${templateName}/(/volume/${volume})`, panel)
            if (err) {
                return resolve()
            }
            resolve(res)
            return
        } catch (err) {
            console.error(err)
            resolve()
        }
    })
}

exports.turnOffAutoStart = ({ templateName, panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/settings/bot/set/${templateName}/run/false`, panel)

            if (err) {
                return resolve()
            }

            resolve(res)
            return
        } catch (err) {
            return reject(err)
        }
    })
}

exports.getBotList = ({ panel }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [res, err] = await audioBotApiHelper(`/api/bot/list`, panel)

            if (err) {
                return reject(err)
            }
            return resolve(res)
        } catch (err) {
            return reject(err)
        }
    })
}

exports.radio = {
    change: ({ templateName, radioUrl, panel }) => {
        return new Promise(async (resolve, reject) => {
            try {
                const encodedUrl = encodeURIComponent(decodeURIComponent(radioUrl)).replace(
                    /[!'()*]/g,
                    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
                )

                await audioBotApiHelper(`/api/bot/template/${templateName}/(/list/clear/Radio/0)`, panel)

                await audioBotApiHelper(`/api/bot/template/${templateName}/(/list/add/Radio/${encodedUrl})`, panel)

                await audioBotApiHelper(`/api/bot/template/${templateName}/(/list/play/Radio)`, panel)

                resolve()
                return
            } catch (err) {
                return reject(err)
            }
        })
    },
}
