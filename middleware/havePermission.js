module.exports = {
    canUseAudioBot: (req, res, next) => {
        if (req.user.scope === "reseller" && !req.user.canUseAudioBot) {
            return res.status(403).json({ message: "Access Denied" })
        } else {
            next()
        }
    },
    canUseServers: (req, res, next) => {
        if (req.user.scope === "reseller" && !req.user.canUseServers) {
            return res.status(403).json({ message: "Access Denied" })
        } else {
            next()
        }
    },
    canUseManagerBots: (req, res, next) => {
        if (req.user.scope === "reseller" && !req.user.canUseManagerBots) {
            return res.status(403).json({ message: "Access Denied" })
        } else {
            next()
        }
    },
    canUseRanksystems: (req, res, next) => {
        if (req.user.scope === "reseller" && !req.user.canUseRanksystems) {
            return res.status(403).json({ message: "Access Denied" })
        } else {
            next()
        }
    },
}
