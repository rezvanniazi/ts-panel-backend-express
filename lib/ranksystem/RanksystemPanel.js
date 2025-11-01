const ioClient = require("socket.io-client")
const { createLogger } = require("../../utils/logger")

const EVENT_NAMES = {
    CREATE: "create-bot",
    DELETE: "delete-bot",
    CONNECT: "connect-bot",
    DISCONNECT: "disconnect-bot",
    ACTIVATE: "activate-bot",
    SUSPEND: "suspend-bot",
    CHANGE_WEB_INTERFACE: "change-web-interface",
    RECONNECT: "reconnect-bot",
    GET_BOT_INFO: "get-bot-info",
    GET_BOT_LIST: "get-bot-list",
}

class RanksystemPanel {
    static #instance = null

    static set(instance) {
        RanksystemPanel.#instance = instance
    }

    static getPanel() {
        if (RanksystemPanel.#instance) {
            return RanksystemPanel.#instance
        } else {
            throw new Error("PANEL_NOT_INITIALIZED")
        }
    }

    static delete(panelId) {
        const instance = RanksystemPanel.getPanel(panelId)
        if (!instance) return false
        try {
            instance.dispose()
        } catch (e) {}
        RanksystemPanel.panelList.delete(panelId)
        return true
    }

    constructor(panelConfig) {
        this.address = panelConfig.host
        this.apiToken = panelConfig.token
        this.socket = null
        this.logger = createLogger("ranksystemPanel", "service")

        RanksystemPanel.set(this)
        this.startConnection()
    }

    startConnection() {
        if (!this.address) throw new Error("address is required for RanksystemPanel")
        const url = this.address
        this.socket = ioClient(url, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            auth: this.apiToken ? { token: this.apiToken } : undefined,
            extraHeaders: this.apiToken ? { Authorization: `X-API-KEY ${this.apiToken}` } : {},
        })

        this.socket.on("connect", () => {
            this.logger.info("Initial Connection successfull")
        })
        this.socket.on("disconnect", () => {
            this.logger.error("Disconnected from server")
        })
        this.socket.on("connect_error", () => {})
        this.socket.on("reconnect", (attemptNumber) => {
            this.logger.error("Reconnected after", attemptNumber, "attempts")
        })
        this.socket.on("reconnect_error", () => {})
    }

    dispose() {
        try {
            if (this.socket) {
                this.socket.removeAllListeners()
                if (this.socket.connected) this.socket.disconnect()
            }
        } catch (e) {}
    }

    emitWithAck(event, payload) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                return reject({ ok: false, error: "SOCKET_NOT_CONNECTED" })
            }
            try {
                this.socket.emit(event, payload, (response) => {
                    if (response && response.ok) return resolve(response)
                    return reject(response || { ok: false, error: "UNKNOWN_ERROR" })
                })
            } catch (err) {
                reject({ ok: false, error: err?.message || "EMIT_FAILED" })
            }
        })
    }

    createBot({ templateName, confweb }) {
        return this.emitWithAck(EVENT_NAMES.CREATE, { templateName, confweb })
    }

    connectBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.CONNECT, { templateName })
    }

    disconnectBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.DISCONNECT, { templateName })
    }
    activateBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.ACTIVATE, { templateName })
    }
    suspendBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.SUSPEND, { templateName })
    }
    changeWebInterface({ templateName, username, password }) {
        return this.emitWithAck(EVENT_NAMES.CHANGE_WEB_INTERFACE, { templateName, username, password })
    }

    deleteBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.DELETE, { templateName })
    }

    reconnectBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.RECONNECT, { templateName })
    }

    getBotInfo({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.GET_BOT_INFO, { templateName })
    }

    getBotList() {
        return this.emitWithAck(EVENT_NAMES.GET_BOT_LIST, {})
    }
}

module.exports = { RanksystemPanel }
