const ioClient = require("socket.io-client")
const { createLogger } = require("../../utils/logger")

const EVENT_NAMES = {
    CREATE: "create-bot",
    DELETE: "delete-bot",
    CONNECT: "connect-bot",
    DISCONNECT: "disconnect-bot",
    RECONNECT: "reconnect-bot",
    GET_BOT_INFO: "get-bot-info",
    GET_BOT_LIST: "get-bot-list",
}

class ManagerBotPanel {
    static panelList = new Map() // panelId -> Class itself
    static set(panelId, instance) {
        ManagerBotPanel.panelList.set(panelId, instance)
    }

    static getPanel(panelId) {
        return ManagerBotPanel.panelList.get(parseInt(panelId)) // Returns undefined if no panel
    }

    static delete(panelId) {
        const instance = ManagerBotPanel.getPanel(panelId)
        if (!instance) return false
        try {
            instance.dispose()
        } catch (e) {}
        ManagerBotPanel.panelList.delete(panelId)
        return true
    }

    constructor(panelConfig) {
        this.address = panelConfig.host
        this.apiToken = panelConfig.token
        this.panelId = panelConfig.id
        this.socket = null
        this.logger = createLogger("managerPanel", panelConfig.id)

        ManagerBotPanel.set(panelConfig.id, this)
        this.startConnection()
    }

    startConnection() {
        if (!this.address) throw new Error("address is required for ManagerBotPanel")
        const url = this.address
        this.socket = ioClient(url, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            auth: this.apiToken ? { token: this.apiToken } : undefined,
            extraHeaders: this.apiToken ? { "x-api-key": `Token ${this.apiToken}` } : {},
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

    createBot({ templateName, channels, conn }) {
        return this.emitWithAck(EVENT_NAMES.CREATE, { templateName, channels, conn })
    }

    connectBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.CONNECT, { templateName })
    }

    disconnectBot({ templateName }) {
        return this.emitWithAck(EVENT_NAMES.DISCONNECT, { templateName })
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

// Public API wrappers for socket client
const initPanel = (panelConfig) => {
    return new ManagerBotPanel(panelConfig)
}

const create = async ({ panel, data }) => {
    const instance = panel instanceof ManagerBotPanel ? panel : ManagerBotPanel.getPanel(panel?.id)
    if (!instance) throw new Error("PANEL_NOT_INITIALIZED")
    return instance.createBot(data)
}

const deleteBot = async ({ panel, data }) => {
    const instance = panel instanceof ManagerBotPanel ? panel : ManagerBotPanel.getPanel(panel?.id)
    if (!instance) throw new Error("PANEL_NOT_INITIALIZED")
    return instance.deleteBot(data)
}

const connect = async ({ panel, data }) => {
    const instance = panel instanceof ManagerBotPanel ? panel : ManagerBotPanel.getPanel(panel?.id)
    if (!instance) throw new Error("PANEL_NOT_INITIALIZED")
    return instance.connectBot(data)
}

const reconnect = async ({ panel, data }) => {
    const instance = panel instanceof ManagerBotPanel ? panel : ManagerBotPanel.getPanel(panel?.id)
    if (!instance) throw new Error("PANEL_NOT_INITIALIZED")
    return instance.reconnectBot(data)
}

const disconnect = async ({ panel, data }) => {
    const instance = panel instanceof ManagerBotPanel ? panel : ManagerBotPanel.getPanel(panel?.id)
    if (!instance) throw new Error("PANEL_NOT_INITIALIZED")
    return instance.disconnectBot(data)
}

const list = async ({ panel }) => {
    const instance = panel instanceof ManagerBotPanel ? panel : ManagerBotPanel.getPanel(panel?.id)
    if (!instance) throw new Error("PANEL_NOT_INITIALIZED")
    return instance.getBotList()
}

const info = async ({ panel, templateName }) => {
    const instance = panel instanceof ManagerBotPanel ? panel : ManagerBotPanel.getPanel(panel?.id)
    if (!instance) throw new Error("PANEL_NOT_INITIALIZED")
    return instance.getBotInfo({ templateName })
}

module.exports = { ManagerBotPanel, info, list, disconnect, reconnect, connect, create, deleteBot }
