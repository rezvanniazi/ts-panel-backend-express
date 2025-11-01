const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const { tokenAuth } = require("./middleware/auth")
const { canUseAudioBot, canUseServers, canUseManagerBots, canUseRanksystems } = require("./middleware/havePermission")
const { rateLimiters } = require("./middleware/rateLimiter")

// Initialize console capture early
require("./utils/consoleCapture")

// Initialize model associations needed at runtime
const Users = require("./models/Users")
const RefreshTokens = require("./models/RefreshTokens")
const Tokens = require("./models/Tokens")
if (typeof RefreshTokens.associate === "function") {
    RefreshTokens.associate({ Users })
}
if (typeof Tokens.associate === "function") {
    Tokens.associate({ Users })
}

// const botsRouter = require("./routes/bots")
const userRouter = require("./routes/user")
const teamspeakRouter = require("./routes/teamspeak")
const audioBotRouter = require("./routes/audioBots")
const settingsRouter = require("./routes/settings")
const managerBotRouter = require("./routes/managerBots")
const ranksystemRouter = require("./routes/ranksystem")
const logsRouter = require("./routes/logs")

const compression = require("compression")
const helmet = require("helmet")

const apiLogger = require("./middleware/apiLogger")

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(express.json())
app.use(compression())
app.use(helmet())
app.use(tokenAuth)
app.use(apiLogger)

// Apply rate limiting
app.use("/api/user/authenticate", rateLimiters.auth) // Strict rate limit for auth

app.use("/api/user", userRouter)
app.use("/api/server", rateLimiters.authenticated, canUseServers, teamspeakRouter)
app.use("/api/audio-bot", rateLimiters.authenticated, canUseAudioBot, audioBotRouter)
app.use("/api/manager-bot", rateLimiters.authenticated, canUseManagerBots, managerBotRouter)
app.use("/api/ranksystem", rateLimiters.authenticated, canUseRanksystems, ranksystemRouter)
app.use("/api/settings", rateLimiters.authenticated, settingsRouter)
app.use("/api/logs", rateLimiters.authenticated, logsRouter)

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs))

module.exports = app
