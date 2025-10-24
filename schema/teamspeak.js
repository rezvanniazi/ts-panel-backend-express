const Joi = require("joi")

const emptyToUndefined = (value, helpers) => {
    if (value === "") {
        return undefined
    }
    return value
}

module.exports = {
    activate: Joi.object({
        serverId: Joi.number().integer().required(),
    }).required(),
    create: Joi.object({
        packageName: Joi.string().required(),
        version: Joi.string().valid("1.5.6", "1.4.22").required(),
        serverport: Joi.number().integer().min(4000).max(7000).optional().empty("").default(null),
        queryport: Joi.number().integer().min(4000).max(7000).optional().empty("").default(null),
        information: Joi.string().max(255).optional().empty(""),
        subdomain: Joi.string().optional().empty(""),
        autorenew: Joi.boolean().default(false).optional().empty(""),
    }).required(),
    delete: Joi.object({
        serverId: Joi.number().integer().required(),
    }).required(),
    editServer: Joi.object({
        serverId: Joi.number().integer().required(),
        packageName: Joi.string().optional().empty(""),
        querypassword: Joi.string().optional().empty(""),
        author: Joi.string().optional().empty(""),
        version: Joi.string().valid("1.5.6", "1.4.22").optional().empty(""),
        information: Joi.string().max(255).optional().empty(""),
        subdomain: Joi.string().optional().allow(""),
        autorenew: Joi.boolean().optional().empty(""),
    }).required(),

    extendServer: Joi.object({
        serverId: Joi.number().integer().required(),
    }).required(),
    restartServer: Joi.object({
        serverId: Joi.number().integer().required(),
    }).required(),

    startServer: Joi.object({
        serverId: Joi.number().integer().required(),
    }).required(),
    restartServer: Joi.object({
        serverId: Joi.number().integer().required(),
    }).required(),
    stopServer: Joi.object({
        serverId: Joi.number().integer().required(),
    }).required(),

    restartServerBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer().required()).optional().empty(""),
    })
        .optional()
        .empty(""),
    stopServerBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer().required()).optional().empty(""),
    })
        .optional()
        .empty(""),
    startServerBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer().required()).optional().empty(""),
    })
        .optional()
        .empty(""),

    suspendServer: Joi.object({
        serverId: Joi.number().integer().required(),
    }),

    snapshot: {
        create: Joi.object({
            serverId: Joi.number().integer().required(),
        }).required(),
        deploy: Joi.object({
            serverId: Joi.number().integer().required(),
            snapshotName: Joi.string().required(),
        }).required(),
        delete: Joi.object({
            serverId: Joi.number().integer().required(),
            snapshotName: Joi.string().required(),
        }).required(),
        getAll: Joi.object({
            serverId: Joi.number().integer().required(),
        }).required(),
    },
    query: {
        getServerGroupList: Joi.object({
            serverId: Joi.number().integer().required(),
        }).required(),
        getOnlineList: Joi.object({
            serverId: Joi.number().integer().required(),
        }).required(),
        getBanList: Joi.object({
            serverId: Joi.number().integer().required(),
        }).required(),
        serverGroupAdd: Joi.object({
            serverId: Joi.number().integer().required(),
            sgid: Joi.number().integer().required(),
            cldbid: Joi.number().integer().required(),
        }).required(),
        serverGroupDel: Joi.object({
            serverId: Joi.number().integer().required(),
            sgid: Joi.number().integer().required(),
            cldbid: Joi.number().integer().required(),
        }).required(),
        banClient: Joi.object({
            serverId: Joi.number().integer().required(),
            banReason: Joi.string().optional(),
            banTime: Joi.number().integer().optional(),
        }).required(),
        unbanClient: Joi.object({
            serverId: Joi.number().integer().required(),
            banid: Joi.number().integer().required(),
        }).required(),
        kickClient: Joi.object({
            serverId: Joi.number().integer().required(),
            clid: Joi.number().integer().required(),
        }).required(),
    },
}
