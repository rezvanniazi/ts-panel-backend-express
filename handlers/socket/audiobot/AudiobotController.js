const AudiobotService = require("./AudiobotService")

let socketServiceInstance = null

module.exports = (io) => {
    // Create singleton instance of SocketService
    if (!socketServiceInstance) {
        socketServiceInstance = new AudiobotService(io)
    }

    return socketServiceInstance
}

// Export getter for accessing the socket service instance
module.exports.getSocketService = () => socketServiceInstance
