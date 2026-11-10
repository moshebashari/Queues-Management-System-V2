const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const Permissions = sequelize.define('Permissions', {
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        canUpdateOthers: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        canCancelOthers: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        canBlockOthers: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }
    }, {
        underscored: true,
        tableName: 'permissions'
    })

    Permissions.associate = (models) => {
        Permissions.belongsTo(models.User, {as: 'user', foreignKey: 'user_id'})
    }

    return Permissions
}