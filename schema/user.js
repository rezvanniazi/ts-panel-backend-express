const Joi = require("joi")

module.exports = {
    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().required(),
        newPasswordConfirm: Joi.string().required(),
    }).required(),
    create: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
        initialBalance: Joi.number().integer().required(),
        scope: Joi.string().allow("admin", "reseller").default("reseller").optional(),
        companyName: Joi.string().required(),
        info: Joi.string().empty("").optional(),
        canUseBot: Joi.bool().default(false).optional(),
        canUseManagerBot: Joi.bool().default(false).optional(),
        canUseServers: Joi.bool().default(false).optional(),
        canUseRanksystems: Joi.bool().default(false).optional(),
    }).required(),
    edit: Joi.object({
        userId: Joi.number().integer().required(),
        password: Joi.string().empty("").optional(),
        balance: Joi.number().integer().optional(),
        scope: Joi.string().allow("admin", "reseller").empty("").optional(),
        companyName: Joi.string().empty("").optional(),
        info: Joi.string().allow("").optional(),
        canUseBot: Joi.bool().optional(),
        canUseManagerBot: Joi.bool().optional(),
        canUseServers: Joi.bool().optional(),
        canUseRanksystems: Joi.bool().optional(),
    }).required(),
    delete: Joi.object({
        userId: Joi.number().integer().required(),
    }).required(),
    fullSuspend: Joi.object({
        userId: Joi.number().integer().required(),
    }).required(),
    suspend: Joi.object({
        userId: Joi.number().integer().required(),
    }).required(),
    fullActivate: Joi.object({
        userId: Joi.number().integer().required(),
    }).required(),
    activate: Joi.object({
        userId: Joi.number().integer().required(),
    }).required(),
    authenticate: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
    }).required(),
    refresh: Joi.object({
        refreshToken: Joi.string().required(),
    }).required(),
    token: {
        create: Joi.object({ timeInDays: Joi.number().integer().empty("").default(null) }).optional(),
        delete: Joi.object({
            tokenId: Joi.number().integer().required(),
        }).required(),
    },
}
