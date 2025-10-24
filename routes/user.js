const express = require("express")
const router = express.Router()
const validate = require("../middleware/validate")
const schema = require("../schema/user")
const isAdmin = require("../middleware/isAdmin")
const { rateLimiters } = require("../middleware/rateLimiter")

const handlers = {
    changePassword: require("../handlers/api/users/changePassword"),
    create: require("../handlers/api/users/createUser"),
    edit: require("../handlers/api/users/editUser"),
    delete: require("../handlers/api/users/deleteUser"),
    fullSuspend: require("../handlers/api/users/fullSuspendUser"),
    suspend: require("../handlers/api/users/suspendUser"),
    fullActivate: require("../handlers/api/users/fullActivateUser"),
    activate: require("../handlers/api/users/activateUser"),

    getUserList: require("../handlers/api/users/getUserList"),
    getCredentials: require("../handlers/api/users/getCredentials"),
    authenticate: require("../handlers/api/users/authenticate").authenticate,
    refresh: require("../handlers/api/users/authenticate").refresh,
    logout: require("../handlers/api/users/authenticate").logout,
    token: {
        create: require("../handlers/api/users/token").genToken,
        delete: require("../handlers/api/users/token").deleteToken,
        getTokenList: require("../handlers/api/users/token").getTokenList,
    },
}

router.post(
    "/change-user-password",

    rateLimiters.authenticated,
    validate(schema.changePassword),
    handlers.changePassword
)

router.post("/create", rateLimiters.authenticated, isAdmin, validate(schema.create), handlers.create)

router.post("/edit", rateLimiters.authenticated, isAdmin, validate(schema.edit), handlers.edit)

router.delete("/delete", rateLimiters.authenticated, isAdmin, validate(schema.delete), handlers.delete)

router.post(
    "/full-suspend",

    rateLimiters.authenticated,
    isAdmin,
    validate(schema.fullSuspend),
    handlers.fullSuspend
)

router.post("/suspend", rateLimiters.authenticated, isAdmin, validate(schema.suspend), handlers.suspend)

router.post(
    "/full-activate",

    rateLimiters.authenticated,
    isAdmin,
    validate(schema.fullActivate),
    handlers.fullActivate
)

router.post("/activate", rateLimiters.authenticated, isAdmin, validate(schema.activate), handlers.activate)

router.post("/authenticate", validate(schema.authenticate), handlers.authenticate)

router.get("/get-credentials", rateLimiters.authenticated, handlers.getCredentials)

router.get("/get-user-list", rateLimiters.authenticated, isAdmin, handlers.getUserList)

router.post("/refresh-token", rateLimiters.authenticated, validate(schema.refresh), handlers.refresh)

router.post("/logout", rateLimiters.authenticated, validate(schema.logout), handlers.logout)

router.post("/token/create", rateLimiters.authenticated, validate(schema.token.create), handlers.token.create)
router.delete("/token/delete", rateLimiters.authenticated, validate(schema.token.delete), handlers.token.delete)
router.get("/token/get-token-list", rateLimiters.authenticated, handlers.token.getTokenList)

module.exports = router
