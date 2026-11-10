const { sequelize } = require('../utils/database');


module.exports = (s, DataTypes) => {
    const Shifts = sequelize.define('Shift', {
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
            { fields: ['business_id'] },
            {
                fields: ['employee_id', 'day_of_week'],
                name: "inx_day_employee",
                unique: true
            }
        ],
        timestamps: false,
        underscored: true,
        tableName: 'shifts'
    })

    Shifts.associate = (models) => {
        Shifts.belongsTo(models.BusinessShop, { as: 'businessShop', foreignKey: 'business_id' });
        Shifts.belongsTo(models.Employee, { as: 'employee', foreignKey: 'employee_id' });
        Shifts.hasMany(models.Break, {as: 'break', foreignKey: 'shift_id', targetKey: 'id' })
    }

    return Shifts
} 