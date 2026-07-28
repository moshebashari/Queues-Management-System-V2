const { sequelize } = require('../utils/database');


module.exports = (s, DataTypes) => {
    const WorkingHours = sequelize.define('WorkingHours', {
        id: {
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'business_shops',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        dayOfWeek: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        startTime: {
            allowNull: false,
            type: DataTypes.TIME,
        },
        endTime: {
            allowNull: false,
            type: DataTypes.TIME
        }
    }, {
        indexes: [
            { fields: ['employee_id'] },
            { fields: ['business_id'] }
        ],
        timestamps: false,
        underscored: true,
        tableName: 'working_hours'
    })

    WorkingHours.associate = (models) => {
        WorkingHours.belongsTo(models.BusinessShop, { as: 'businessShop', foreignKey: 'business_id' });
        WorkingHours.belongsTo(models.Employee, { as: 'employee', foreignKey: 'employee_id' });
    }

    return WorkingHours
} 