const express = require("express")
const router = express.Router()
const validate = require("../middleware/validate")
const schema = require("../schema/settings")
const isAdmin = require("../middleware/isAdmin.js")
const havePermission = require("../middleware/havePermission.js")

const handlers = {
    audiobotPackages: {
        create: require("../handlers/api/settings/audiobotPackages/audiobotPackages").create,
        edit: require("../handlers/api/settings/audiobotPackages/audiobotPackages").edit,
        delete: require("../handlers/api/settings/audiobotPackages/audiobotPackages").delete,
        getAll: require("../handlers/api/settings/audiobotPackages/audiobotPackages").getAll,
    },
    company: {
        create: require("../handlers/api/settings/company/createCompany"),
        edit: require("../handlers/api/settings/company/editCompany"),
        delete: require("../handlers/api/settings/company/deleteCompany"),
        getAll: require("../handlers/api/settings/company/getCompanyList"),
    },
    globalMessage: {
        send: require("../handlers/api/settings/globalMessage/sendGlobalMessage"),
    },
    managerPanel: {
        create: require("../handlers/api/settings/managerPanel/createPanel"),
        edit: require("../handlers/api/settings/managerPanel/editPanel"),
        delete: require("../handlers/api/settings/managerPanel/deletePanel"),
        getAll: require("../handlers/api/settings/managerPanel/getPanelList"),
    },
    musicPanel: {
        create: require("../handlers/api/settings/musicPanel/createPanel"),
        edit: require("../handlers/api/settings/musicPanel/editPanel"),
        delete: require("../handlers/api/settings/musicPanel/deletePanel"),
        getAll: require("../handlers/api/settings/musicPanel/getPanelList"),
    },
    permissions: {
        get: require("../handlers/api/settings/permissions/getPermissions"),
        update: require("../handlers/api/settings/permissions/updatePermissions"),
    },
    radio: {
        add: require("../handlers/api/settings/radio/addRadio"),
        edit: require("../handlers/api/settings/radio/editRadio"),
        delete: require("../handlers/api/settings/radio/deleteRadio"),
        getAll: require("../handlers/api/settings/radio/getRadioList"),
    },
    ranksystemConfig: {
        get: require("../handlers/api/settings/ranksystemConfig/getConfig.js"),
        update: require("../handlers/api/settings/ranksystemConfig/updateConfig.js"),
    },
    serverPacages: {
        create: require("../handlers/api/settings/serverPackages/serverPackages").create,
        edit: require("../handlers/api/settings/serverPackages/serverPackages").edit,
        delete: require("../handlers/api/settings/serverPackages/serverPackages").delete,
        getAll: require("../handlers/api/settings/serverPackages/serverPackages").getAll,
    },
    userCustomCommands: {
        get: require("../handlers/api/settings/userCustomCommands/getCustomCommands"),
        update: require("../handlers/api/settings/userCustomCommands/updateCustomCommands"),
    },
    refreshPanels: require("../handlers/api/settings/refreshPanels"),
}

/**
 * @swagger
 * tags:
 *   - name: Settings
 *     description: Settings and configuration
 */

// Audiobot Packages
/**
 * @swagger
 * /api/settings/packages/audiobot/create:
 *   post:
 *     tags: [Settings]
 *     summary: Create an audio bot package
 *     responses:
 *       200:
 *         description: Created
 */
router.post(
    "/packages/audiobot/create",
    isAdmin,
    validate(schema.audiobotPackages.create),
    handlers.audiobotPackages.create
)
/**
 * @swagger
 * /api/settings/packages/audiobot/edit:
 *   post:
 *     tags: [Settings]
 *     summary: Edit an audio bot package
 *     responses:
 *       200:
 *         description: Edited
 */
router.post("/packages/audiobot/edit", isAdmin, validate(schema.audiobotPackages.edit), handlers.audiobotPackages.edit)
/**
 * @swagger
 * /api/settings/packages/audiobot/delete:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete an audio bot package
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
    "/packages/audiobot/delete",
    isAdmin,
    validate(schema.audiobotPackages.delete),
    handlers.audiobotPackages.delete
)
/**
 * @swagger
 * /api/settings/packages/audiobot/getAll:
 *   get:
 *     tags: [Settings]
 *     summary: Get all audio bot packages
 *     responses:
 *       200:
 *         description: List
 */
router.get("/packages/audiobot/getAll", havePermission.canUseAudioBot, handlers.audiobotPackages.getAll)

// Company
/**
 * @swagger
 * /api/settings/company/create:
 *   post:
 *     tags: [Settings]
 *     summary: Create a company
 *     responses:
 *       200:
 *         description: Created
 */
router.post("/company/create", isAdmin, validate(schema.company.create), handlers.company.create)
/**
 * @swagger
 * /api/settings/company/edit:
 *   post:
 *     tags: [Settings]
 *     summary: Edit a company
 *     responses:
 *       200:
 *         description: Edited
 */
router.post("/company/edit", isAdmin, validate(schema.company.edit), handlers.company.edit)
/**
 * @swagger
 * /api/settings/company/delete:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete a company
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/company/delete", isAdmin, validate(schema.company.delete), handlers.company.delete)
/**
 * @swagger
 * /api/settings/company/getAll:
 *   post:
 *     tags: [Settings]
 *     summary: Get all companies
 *     responses:
 *       200:
 *         description: List
 */
router.get("/company/getAll", isAdmin, handlers.company.getAll)

// Global Message
/**
 * @swagger
 * /api/settings/global-message/send:
 *   post:
 *     tags: [Settings]
 *     summary: Send a global message to users
 *     responses:
 *       200:
 *         description: Sent
 */
router.post(
    "/global-message/send",
    havePermission.canUseServers,
    validate(schema.globalMessage.send),
    handlers.globalMessage.send
)

// Manager Panel
/**
 * @swagger
 * /api/settings/panel/manager/create:
 *   post:
 *     tags: [Settings]
 *     summary: Create a manager panel
 *     responses:
 *       200:
 *         description: Created
 */
router.post("/panel/manager/create", isAdmin, validate(schema.managerPanel.create), handlers.managerPanel.create)
/**
 * @swagger
 * /api/settings/panel/manager/edit:
 *   post:
 *     tags: [Settings]
 *     summary: Edit a manager panel
 *     responses:
 *       200:
 *         description: Edited
 */
router.post("/panel/manager/edit", isAdmin, validate(schema.managerPanel.edit), handlers.managerPanel.edit)
/**
 * @swagger
 * /api/settings/panel/manager/delete:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete a manager panel
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/panel/manager/delete", isAdmin, validate(schema.managerPanel.delete), handlers.managerPanel.delete)
/**
 * @swagger
 * /api/settings/panel/manager/getAll:
 *   get:
 *     tags: [Settings]
 *     summary: Get all manager panels
 *     responses:
 *       200:
 *         description: List
 */
router.get("/panel/manager/getAll", isAdmin, handlers.managerPanel.getAll)

// Music Panel
/**
 * @swagger
 * /api/settings/panel/audiobot/create:
 *   post:
 *     tags: [Settings]
 *     summary: Create a music panel
 *     responses:
 *       200:
 *         description: Created
 */
router.post("/panel/audiobot/create", isAdmin, validate(schema.musicPanel.create), handlers.musicPanel.create)
/**
 * @swagger
 * /api/settings/panel/audiobot/edit:
 *   post:
 *     tags: [Settings]
 *     summary: Edit a music panel
 *     responses:
 *       200:
 *         description: Edited
 */
router.post("/panel/audiobot/edit", isAdmin, validate(schema.musicPanel.edit), handlers.musicPanel.edit)
/**
 * @swagger
 * /api/settings/panel/audiobot/delete:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete a music panel
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/panel/audiobot/delete", isAdmin, validate(schema.musicPanel.delete), handlers.musicPanel.delete)
/**
 * @swagger
 * /api/settings/panel/audiobot/getAll:
 *   get:
 *     tags: [Settings]
 *     summary: Get all music panels
 *     responses:
 *       200:
 *         description: List
 */
router.get("/panel/audiobot/getAll", isAdmin, handlers.musicPanel.getAll)

// Permissions
/**
 * @swagger
 * /api/settings/permissions/update:
 *   post:
 *     tags: [Settings]
 *     summary: Update permissions
 *     responses:
 *       200:
 *         description: Updated
 */
router.post("/permissions/update", isAdmin, validate(schema.permissions.update), handlers.permissions.update)
/**
 * @swagger
 * /api/settings/permissions/get:
 *   get:
 *     tags: [Settings]
 *     summary: Get permissions
 *     responses:
 *       200:
 *         description: Permissions
 */
router.get("/permissions/get", havePermission.canUseManagerBots, handlers.permissions.get)

// Radio
/**
 * @swagger
 * /api/settings/radio/add:
 *   post:
 *     tags: [Settings]
 *     summary: Add a radio
 *     responses:
 *       200:
 *         description: Added
 */
router.post("/radio/add", isAdmin, validate(schema.radio.add), handlers.radio.add)
/**
 * @swagger
 * /api/settings/radio/edit:
 *   post:
 *     tags: [Settings]
 *     summary: Edit a radio
 *     responses:
 *       200:
 *         description: Edited
 */
router.post("/radio/edit", isAdmin, validate(schema.radio.edit), handlers.radio.edit)
/**
 * @swagger
 * /api/settings/radio/delete:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete a radio
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/radio/delete", isAdmin, validate(schema.radio.delete), handlers.radio.delete)
/**
 * @swagger
 * /api/settings/radio/getAll:
 *   get:
 *     tags: [Settings]
 *     summary: Get all radios
 *     responses:
 *       200:
 *         description: List
 */
router.get("/radio/getAll", havePermission.canUseAudioBot, handlers.radio.getAll)

// Ranksystem Config
/**
 * @swagger
 * /api/settings/ranksystem-config/update:
 *   post:
 *     tags: [Settings]
 *     summary: Update ranksystem config
 *     responses:
 *       200:
 *         description: Updated
 */

router.get("/panel/refresh-panels", isAdmin, handlers.refreshPanels)

router.post(
    "/ranksystem-config/update",
    isAdmin,
    validate(schema.ranksystemConfig.update),
    handlers.ranksystemConfig.update
)
/**
 * @swagger
 * /api/settings/ranksystem-config/get:
 *   get:
 *     tags: [Settings]
 *     summary: Get ranksystem config
 *     responses:
 *       200:
 *         description: Config
 */
router.get("/ranksystem-config/get", isAdmin, handlers.ranksystemConfig.get)

// Server Packages
/**
 * @swagger
 * /api/settings/packages/server/create:
 *   post:
 *     tags: [Settings]
 *     summary: Create a server package
 *     responses:
 *       200:
 *         description: Created
 */
router.post("/packages/server/create", isAdmin, validate(schema.serverPackages.create), handlers.serverPacages.create)
/**
 * @swagger
 * /api/settings/packages/server/edit:
 *   post:
 *     tags: [Settings]
 *     summary: Edit a server package
 *     responses:
 *       200:
 *         description: Edited
 */
router.post("/packages/server/edit", isAdmin, validate(schema.serverPackages.edit), handlers.serverPacages.edit)
/**
 * @swagger
 * /api/settings/packages/server/delete:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete a server package
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/packages/server/delete", isAdmin, validate(schema.serverPackages.delete), handlers.serverPacages.delete)
/**
 * @swagger
 * /api/settings/packages/server/getAll:
 *   get:
 *     tags: [Settings]
 *     summary: Get all server packages
 *     responses:
 *       200:
 *         description: List
 */
router.get("/packages/server/getAll", havePermission.canUseServers, handlers.serverPacages.getAll)

// User Custom Commands
/**
 * @swagger
 * /api/settings/custom-commands/update:
 *   post:
 *     tags: [Settings]
 *     summary: Update user custom commands
 *     responses:
 *       200:
 *         description: Updated
 */
router.post(
    "/custom-commands/update",
    havePermission.canUseServers,
    validate(schema.userCustomCommands.update),
    handlers.userCustomCommands.update
)
/**
 * @swagger
 * /api/settings/custom-commands/get:
 *   get:
 *     tags: [Settings]
 *     summary: Get user custom commands
 *     responses:
 *       200:
 *         description: Commands
 */
router.get("/custom-commands/get", havePermission.canUseServers, handlers.userCustomCommands.get)

module.exports = router
