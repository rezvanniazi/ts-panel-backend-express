const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")
const bcrypt = require("bcryptjs")

const Users = sequelize.define(
    "Users",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: true,
            validate: {
                is: /^[a-zA-Z0-9_]{3,45}$/, // Alphanumeric + underscore, 3-45 chars
            },
        },
        password: {
            type: DataTypes.BLOB, // For varbinary storage
            allowNull: false,
            set(value) {
                // Always hash passwords before storing
                const salt = bcrypt.genSaltSync(10)
                const hash = bcrypt.hashSync(value, salt)
                this.setDataValue("password", hash)
            },
        },

        scope: {
            type: DataTypes.STRING(45),
            allowNull: false,
            validate: {
                isIn: [["reseller", "admin"]], // Example scopes
            },
        },
        status: {
            type: DataTypes.STRING(45),
            allowNull: false,
            defaultValue: "active",
            validate: {
                isIn: [["active", "suspended"]],
            },
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        info: {
            type: DataTypes.STRING(55),
            allowNull: true,
        },
        balance: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0, // Prevent negative balance
            },
        },
        company_name: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        global_command: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        can_use_bot: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        can_use_manager_bots: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        can_use_servers: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        can_use_ranksystems: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: false,
        hooks: {
            afterCreate: (user) => {
                const svc = global.userService
                if (svc) {
                    svc.tableChanges.create(user)
                }
            },
            afterUpdate: (user) => {
                const svc = global.userService
                if (svc) {
                    svc.tableChanges.update(user)
                }
            },
            afterDestroy: (user) => {
                const svc = global.userService
                if (svc) {
                    svc.tableChanges.delete(user)
                }
            },
        },
        indexes: [
            {
                fields: ["username"],
                unique: true,
            },

            {
                fields: ["status"],
            },
            {
                fields: ["scope"],
            },
        ],
    }
)

// Instance method to check password
Users.prototype.verifyPassword = function (password) {
    return bcrypt.compareSync(password, this.password.toString())
}

Users.prototype.addBalance = async function (amount, transaction = null) {
    if (amount < 0) {
        throw new Error("Amount must be positive")
    }

    if (transaction && transaction.LOCK && transaction.LOCK.UPDATE) {
        await this.reload({ transaction, lock: transaction.LOCK.UPDATE })
    }

    const newBalance = this.balance + amount
    return await this.update({ balance: newBalance }, { transaction })
}

Users.prototype.subtractBalance = async function (amount, transaction = null) {
    if (amount < 0) {
        throw new Error("Amount must be positive")
    }

    if (transaction && transaction.LOCK && transaction.LOCK.UPDATE) {
        await this.reload({ transaction, lock: transaction.LOCK.UPDATE })
    }

    if (this.balance < amount) {
        throw new Error("Insufficient balance")
    }

    const newBalance = this.balance - amount
    return await this.update({ balance: newBalance }, { transaction })
}

module.exports = Users
