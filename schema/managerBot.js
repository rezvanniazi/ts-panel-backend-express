const Joi = require("joi")

module.exports = {
    activate: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    connect: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    connectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer()).required(),
    }),

    create: Joi.object({
        templateName: Joi.string().required(),
        selectedPerms: Joi.object().required(),
        conn: Joi.object().required(),
        channels: Joi.object().required(),
        panelId: Joi.number().integer().allow(null),
        autorenew: Joi.bool().default(false),
    }),

    delete: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    disconnect: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    disconnectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer()).required(),
    }),

    edit: Joi.object({
        botId: Joi.number().integer().required(),
        selectedPerms: Joi.object().required(),
        conn: Joi.object().required(),
        channels: Joi.object().required(),
        panelId: Joi.number().integer().allow(null),
        autorenew: Joi.bool().optional().default(null),
    }).required(),

    extend: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    reconnect: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    reconnectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer()).required(),
    }),

    suspend: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),

    fetchConnectionData: Joi.object({
        host: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        queryPort: Joi.number().integer().required(),
        serverPort: Joi.number().integer().required(),
    }).required(),
}
