const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Tokens = sequelize.define(
    "Tokens",
    {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: "Users",
                key: "id",
            },
        },
        token_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        timestamps: false,
    }
)

Tokens.associate = (models) => {
    Tokens.belongsTo(models.Users, {
        foreignKey: "user_id",
        as: "user",
    })
}

module.exports = Tokens
