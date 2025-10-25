const Joi = require("joi")

module.exports = {
    activate: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
    create: Joi.object({
        botName: Joi.string().required(),
        botServerIp: Joi.string().required(),
        botDefaultChannelName: Joi.string().empty("").optional(),
        botPackageName: Joi.string().required(),
        panelId: Joi.number().integer().empty(null).optional(),
        information: Joi.string().optional().empty(""),
        autorenew: Joi.bool().default(false).optional(),
    }).required(),
    changeBotPlaying: Joi.object({
        botId: Joi.number().integer().required(),
        radioName: Joi.string().required(),
    }).required(),
    changeVolume: Joi.object({
        botId: Joi.number().integer().required(),
        volume: Joi.number().integer().min(0).max(100).required(),
    }).required(),
    editBot: Joi.object({
        botId: Joi.number().integer().required(),
        botName: Joi.string().empty("").optional(),
        botServerIp: Joi.string().empty("").optional(),
        botDefaultChannelName: Joi.string().empty("").optional(),
        information: Joi.string().empty("").optional(),
        panelId: Joi.number().integer().empty(null).optional(),
        autorenew: Joi.bool().empty("").optional(),
    }).required(),
    delete: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
    extendBot: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
    connectBot: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
    connectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer().optional()).empty("").optional(),
    })
        .optional()
        .empty(""),
    reconnectBot: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
    reconnectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer().required()).optional().empty(""),
    })
        .optional()
        .empty(""),
    disconnectBot: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
    disconnectBulk: Joi.object({
        selecteds: Joi.array().items(Joi.number().integer().required()).optional().empty(""),
    })
        .optional()
        .empty(""),
    suspendBot: Joi.object({
        botId: Joi.number().integer().required(),
    }).required(),
}
