const Joi = require("joi")

module.exports = {
    activate: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    connect: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    connectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer()).optional(),
    }),

    create: Joi.object({
        templateName: Joi.string().required(),
        confuser: Joi.string().required(),
        confpass: Joi.string().required(),
        information: Joi.string().empty("").optional(),
    }).required(),
    delete: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    disconnect: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    disconnectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer()).optional(),
    }),

    edit: Joi.object({
        botId: Joi.number().integer().required(),
        confuser: Joi.string().empty("").optional(),
        confpass: Joi.string().empty("").optional(),
        information: Joi.string().empty("").optional(),
        autorenew: Joi.boolean().empty(null).optional(),
    }).required(),

    extend: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    getBotInfo: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    reconnect: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    reconnectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer()).optional(),
    }),

    suspend: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
}
