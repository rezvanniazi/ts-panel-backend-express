const ManagerbotService = require("./ManagerbotService")

let socketServiceInstance = null

module.exports = (io) => {
    // Create singleton instance of SocketService
    if (!socketServiceInstance) {
        socketServiceInstance = new ManagerbotService(io)
    }

    return socketServiceInstance
}

// Export getter for accessing the socket service instance
module.exports.getSocketService = () => socketServiceInstance
