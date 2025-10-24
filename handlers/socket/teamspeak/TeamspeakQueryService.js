const { Raw } = require("teamspeak-query")

class TeamspeakQueryService extends Raw {
    static connectedServers = new Map() // socketId -> TeamspeakQueryService

    constructor(socket, server) {
        if (!socket || !server) {
            throw new Error("Socket and server is required")
        }

        // Enforce single active connection per socket
        const socketId = socket.id
        const existing = TeamspeakQueryService.connectedServers.get(socketId)
        if (existing && existing !== this) {
            try {
                existing.disconnect()
            } catch (e) {
                console.log(e)
            }
        }
        super({ host: "localhost", port: server.query_port })
        this.onlineList = new Map() // clid -> client

        this.socket = socket
        this.server = server
        this.user = socket.request.user
        this._boundEvents = new Set()

        TeamspeakQueryService.connectedServers.set(socketId, this)

        this.setMaxListeners(20)

        this.initializeConnection()
        this.initializeEvents()
    }

    async initializeConnection() {
        try {
            const server = this.server
            await new Promise((resolve, reject) => {
                this.connectSocket()
                    .then((res) => {
                        console.log(`${this.user.username} Connected to ${server.server_port}`)
                        this.send("login", "serveradmin", server.query_password)
                            .then(() => this.send("use", 1))
                            .then(async () => {
                                this.connected = true
                                await this.throttle.set("enable", false)
                                this.newListener = true
                                this.sendOnlineUsers()
                                this.initializeEvents()
                                await this.send("clientupdate", { client_nickname: "PanelManager" })
                                await this.send("servernotifyregister", { event: "server" }).catch((err) =>
                                    console.log(err)
                                )
                                this.on("cliententerview", (ev) => {
                                    if (!this.onlineList.has(ev.clid) && ev.client_type != 0) {
                                        this.onlineList.set(ev.clid, ev)
                                        this.socket.emit("client_entered", ev)
                                    }
                                })
                                this.on("clientleftview", (ev) => {
                                    if (this.onlineList.has(ev.clid) && ev.client_type != 0) {
                                        this.onlineList.delete(ev.clid)
                                        this.socket.emit("client_left", ev)
                                    }
                                })
                            })
                        resolve()
                    })
                    .catch((err) => {
                        console.log(err)
                        this.connected = false
                        reject()
                    })

                return
            })
        } catch (err) {
            this.handleDisconnection()

            this.socket.emit("bot_connection_error")
            return
        }
    }

    initializeEvents() {
        const sock = this.socket
        const onOnce = (ev, handler) => {
            if (this._boundEvents.has(ev)) return
            sock.on(ev, handler)
            this._boundEvents.add(ev)
        }

        onOnce("kick", (payload) => {
            const clid = payload.clid
            this.send("clientkick", { clid, reasonid: "5" })
        })
        onOnce("ban", (payload) => {
            const { banReason, banTime, clid } = payload
            this.send("banclient", { clid, time: banTime, banreason: banReason })
        })
        onOnce("serverGroupAdd", (payload) => {
            const { sgid, cldbid } = payload

            this.send("servergroupaddclient", { sgid, cldbid })
        })
        onOnce("serverGroupRemove", (payload) => {
            const { sgid, cldbid } = payload

            this.send("servergroupdelclient", { sgid, cldbid })
        })
        onOnce("getServerGroupList", async () => {
            const sgList = await this.fetchSgList()

            this.socket.emit("serverGroupList", sgList)
        })
        onOnce("getChannelList", async () => {
            const chList = await this.fetchChannelList()

            this.socket.emit("channelList", chList)
        })

        // Add disconnection detection
        onOnce("disconnect", () => {
            this.handleDisconnection()
        })

        onOnce("error", (error) => {
            console.error("Socket error:", error)
            this.handleDisconnection()
        })
    }

    _detachSocketEvents(sock) {
        sock.off("kick")
        sock.off("ban")
        sock.off("serverGroupAdd")
        sock.off("serverGroupRemove")
        sock.off("getServerGroupList")
        sock.off("disconnect")
        sock.off("error")
        this._boundEvents.clear()
    }

    async sendOnlineUsers() {
        const response = await this.send(
            "clientlist  -uid -away -voice -times -groups -info -icon -country -ip -location"
        )
        let onlineUsers = this.transformTeamspeakResponse(response)
        console.log(onlineUsers)
        onlineUsers = onlineUsers.filter((r) => r.client_type == 0)
        onlineUsers.forEach((u) => this.onlineList.set(u.clid, u))

        this.socket.emit("online_users", onlineUsers)
    }

    async fetchSgList() {
        const response = await this.send("servergrouplist")
        const sgList = this.transformTeamspeakResponse(response)

        return sgList
    }

    transformTeamspeakResponse(response) {
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

    _disconnect() {
        // Clean up socket events
        if (this.socket) {
            this._detachSocketEvents(this.socket)
        }

        // Remove from registry if it points to this instance
        const socketId = this.socket?.id
        if (socketId && TeamspeakQueryService.connectedServers.get(socketId) === this) {
            TeamspeakQueryService.connectedServers.delete(socketId)
        }

        // Close TeamSpeak connection
        if (this.bot) {
            this.disconnect()
        }
    }

    handleDisconnection() {
        console.log(`User ${this.user.username} disconnected from server ${this.server.server_port}`)
        this.disconnect()
    }
}

module.exports = TeamspeakQueryService
