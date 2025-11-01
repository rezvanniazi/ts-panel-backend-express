const RanksystemService = require("./RanksystemService")

let socketServiceInstance = null

module.exports = (io) => {
    // Create singleton instance of SocketService
    if (!socketServiceInstance) {
        socketServiceInstance = new RanksystemService(io)
    }

    return socketServiceInstance
}

// Export getter for accessing the socket service instance
module.exports.getSocketService = () => socketServiceInstance
