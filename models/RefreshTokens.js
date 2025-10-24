const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const RefreshTokens = sequelize.define(
    "RefreshTokens",
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
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        token_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        revoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        timestamps: false,

        indexes: [
            {
                fields: ["user_id"],
            },
            {
                fields: ["token_hash"],
                unique: true,
            },
            {
                fields: ["expires_at"],
            },
            {
                fields: ["revoked"],
            },
        ],
    }
)

// Define association with Users model
RefreshTokens.associate = (models) => {
    RefreshTokens.belongsTo(models.Users, {
        foreignKey: "user_id",
        as: "user",
    })
}

module.exports = RefreshTokens
