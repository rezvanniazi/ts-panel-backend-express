const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const TsManagerBots = sequelize.define(
    "TsManagerBots",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        template_name: {
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
            },
        },
        expires: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue("expires")
                return rawValue ? new Date(rawValue) : null
            },
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        author: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        information: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        state: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "active",
            validate: {
                isIn: [["active", "suspended", "archived"]],
            },
        },
        status: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "online",
            validate: {
                isIn: [["online", "offline", "maintenance"]],
            },
        },
        panel_id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
        },
        conn: {
            type: DataTypes.TEXT("long"),
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("conn")
                return rawValue ? JSON.parse(rawValue) : null
            },
            set(value) {
                this.setDataValue("conn", JSON.stringify(value))
            },
        },
        channels: {
            type: DataTypes.TEXT("long"),
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("channels")
                return rawValue ? JSON.parse(rawValue) : null
            },
            set(value) {
                this.setDataValue("channels", JSON.stringify(value))
            },
        },
        permissions: {
            type: DataTypes.TEXT("long"),
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("permissions")
                return rawValue ? JSON.parse(rawValue) : null
            },
            set(value) {
                this.setDataValue("permissions", JSON.stringify(value))
            },
        },
        autorenew: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: false,
        hooks: {
            afterCreate: (bot) => {
                const svc = global.managerbotService
                if (svc) {
                    svc.tableChanges.create(bot)
                }
            },
            afterUpdate: (bot) => {
                const svc = global.managerbotService
                if (svc) {
                    svc.tableChanges.update(bot)
                }
            },
            afterDestroy: (bot) => {
                const svc = global.managerbotService
                if (svc) {
                    svc.tableChanges.delete(bot)
                }
            },
            afterFind: async (result) => {
                const parse = (r) => {
                    if (!r) return
                    if (typeof r.conn === "string") r.conn = JSON.parse(r.conn)
                    if (typeof r.channels === "string") r.channels = JSON.parse(r.channels)
                    if (typeof r.permissions === "string") r.permissions = JSON.parse(r.permissions)
                }
                if (Array.isArray(result)) result.forEach(parse)
                else parse(result)
            },
        },
        indexes: [
            {
                fields: ["state"],
            },
            {
                fields: ["status"],
            },
            {
                fields: ["panel_id"],
            },
            {
                fields: ["expires"],
            },
            {
                fields: ["author"],
            },
        ],
    }
)

// Instance method to check expiration
TsManagerBots.prototype.isExpired = function () {
    return this.expires && new Date(this.expires) < new Date()
}

// Class method to suspend all expired templates
TsManagerBots.suspendExpired = async function () {
    return this.update(
        { state: "suspended", status: "offline" },
        {
            where: {
                expires: { [Op.lt]: new Date() },
                state: { [Op.ne]: "suspended" },
            },
        }
    )
}

module.exports = TsManagerBots
