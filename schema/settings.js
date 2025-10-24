const Joi = require("joi")

exports.audiobotPackages = {
    create: Joi.object({
        packageName: Joi.string().required(),
        packageDescription: Joi.string().required(),
        packageDays: Joi.number().integer().empty(null, "").optional(),
        packageAmount: Joi.number().integer().required(),
        packageForAdmin: Joi.bool().default(false).optional(),
        packageType: Joi.string().valid("youtube", "normal").required(),
    }).required(),
    edit: Joi.object({
        packageId: Joi.number().integer().required(),
        packageDescription: Joi.string().required(),
        packageDays: Joi.number().integer().empty(null, "").optional(),
        packageAmount: Joi.number().integer().required(),
        packageForAdmin: Joi.bool().default(false).optional(),
        packageType: Joi.string().valid("youtube", "normal").required(),
    }).required(),
    delete: Joi.object({
        packageId: Joi.number().integer().required(),
    }).required(),
}

exports.company = {
    create: Joi.object({
        name: Joi.string().required(),
        domainName: Joi.string().required(),
        cloudfToken: Joi.string().required(),
        domainIp: Joi.string().required(),
    }).required(),
    edit: Joi.object({
        companyId: Joi.number().integer().required(),
        name: Joi.string().empty("").optional(),
        cloudfToken: Joi.string().empty("").optional(),
        domainIp: Joi.string().empty("").optional(),
    }).required(),
    delete: Joi.object({
        companyId: Joi.number().integer().required(),
    }).required(),
}

exports.globalMessage = {
    send: Joi.object({
        msg: Joi.string().required(),
    }).required(),
}

exports.managerPanel = {
    create: Joi.object({
        name: Joi.string().required(),
        token: Joi.string().required(),
        host: Joi.string().required(),
        maxBot: Joi.number().integer().required(),
    }).required(),
    edit: Joi.object({
        panelId: Joi.number().integer().required(),
        token: Joi.string().empty("", null).optional(),
        host: Joi.string().empty("", null).optional(),
        maxBot: Joi.number().empty("", null).optional(),
    }).required(),
    delete: Joi.object({
        panelId: Joi.number().integer().required(),
    }).required(),
}

exports.musicPanel = {
    create: Joi.object({
        name: Joi.string().required(),
        token: Joi.string().required(),
        host: Joi.string().required(),
        maxBot: Joi.number().integer().required(),
        panelType: Joi.string().valid("youtube", "normal").required(),
    }).required(),
    edit: Joi.object({
        panelId: Joi.number().integer().required(),
        token: Joi.string().empty("", null).optional(),
        host: Joi.string().empty("", null).optional(),
        maxBot: Joi.number().empty("", null).optional(),
        panelType: Joi.string().valid("youtube", "normal").empty("").optional(),
    }).required(),
    delete: Joi.object({
        panelId: Joi.number().integer().required(),
    }).required(),
}

exports.permissions = {
    update: Joi.object({
        perms: Joi.object().required(),
    }).required(),
}

exports.radio = {
    add: Joi.object({
        name: Joi.string().required(),
        url: Joi.string().required(),
        information: Joi.string().allow("").optional(),
    }).required(),
    edit: Joi.object({
        radioId: Joi.number().integer().required(),
        name: Joi.string().empty("").optional(),
        url: Joi.string().empty("").optional(),
        information: Joi.string().allow("").optional(),
    }).required(),
    delete: Joi.object({
        radioId: Joi.number().integer().required(),
    }).required(),
}

exports.ranksystemConfig = {
    update: Joi.object({
        price: Joi.number().integer().required(),

        backend: Joi.object({
            url: Joi.string().required(),
            token: Joi.string().required(),
        }).required(),
    }).required(),
}

exports.serverPackages = {
    create: Joi.object({
        packageName: Joi.string().required(),
        packageDescription: Joi.string().required(),
        packageDays: Joi.number().integer().empty(null, "").optional(),
        packageSlots: Joi.number().integer().required(),
        packageAmount: Joi.number().integer().required(),
        packageForAdmin: Joi.bool().default(false).optional(),
    }).required(),
    edit: Joi.object({
        packageId: Joi.number().integer().required(),
        packageDescription: Joi.string().required(),
        packageDays: Joi.number().integer().empty(null, "").optional(),
        packageSlots: Joi.number().integer().required(),
        packageAmount: Joi.number().integer().required(),
        packageForAdmin: Joi.bool().default(false).optional(),
    }).required(),
    delete: Joi.object({
        packageId: Joi.number().integer().required(),
    }).required(),
}

exports.userCustomCommands = {
    update: Joi.object({
        customCommands: Joi.object().required(),
    }).required(),
}
