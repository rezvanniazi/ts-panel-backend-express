const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const AudioBots = sequelize.define(
    "AudioBots",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        bot_server_ip: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },

        bot_default_channel_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        bot_channel_commander_is_on: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: 0,
        },
        bot_owner: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        information: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        expires: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        package_name: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "normal",
        },
        template_name: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        state: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "active",
        },
        playing: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "offline",
        },
        panel_id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
        },
        autorenew: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        hooks: {
            afterCreate: (bot) => {
                const svc = global.audiobotService
                if (svc) {
                    svc.tableChanges.create(bot)
                }
            },
            afterUpdate: (bot) => {
                const svc = global.audiobotService
                if (svc) {
                    svc.tableChanges.update(bot)
                }
            },
            afterDestroy: (bot) => {
                const svc = global.audiobotService
                if (svc) {
                    svc.tableChanges.delete(bot)
                }
            },
        },
        timestamps: false, // since you have a 'created' column manually defined
    }
)

AudioBots.prototype.isExpired = function () {
    return this.expires && new Date(this.expires) < new Date()
}

module.exports = AudioBots
