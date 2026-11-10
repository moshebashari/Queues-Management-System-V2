const { sequelize } = require('../utils/database');

const BLOCKAGE_STATUSES = ['active', 'cancelled'];


module.exports = (s, DataTypes) => {
    const EmployeeBlockage = sequelize.define('EmployeeBlockage', {
        id: {
            primaryKey: true,
            autoIncrement: true,
            type: DataTypes.INTEGER
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        startTime: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'active',
            allowNull: false,
            validate: {
                isIn: {
                    args: [BLOCKAGE_STATUSES],
                    msg: 'Status has to be one of the following: active, cancelled'
                }
            }
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    }, {
        indexes: [
            {
                name: 'idx_blockages_employee_status_datetime',
                fields: ['user_id', 'status', 'start_time', 'end_time']
            }
        ],
        tableName: 'employee_blockages',
        underscored: true,
        timestamps: true,
    })

    EmployeeBlockage.associate = (models) => {
        EmployeeBlockage.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
    }


    return EmployeeBlockage
}