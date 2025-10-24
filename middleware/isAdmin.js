const isAdmin = (req, res, next) => {
    return req.user.scope === "admin" ? next() : res.status(403).json({ message: "Access Denied" })
}

module.exports = isAdmin
