const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const EmployeeConfigs = sequelize.define('EmployeeConfigs', {
        employeeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'employees',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        appointmentDuration: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 20
        },
        bookingWindow: {
            allowNull: true,
            type: DataTypes.JSON,
            defaultValue: () => ({
                unit: 'month',
                amount: 1
            }),
            validate: {
                isValidFormat(value) {
                    if (!value.unit || typeof value.amount !== 'number') {
                        throw new Error('Booking window must contain unit and amount');
                    }
                }
            }
        }
    }, {
        underscored: true,
        tableName: 'employee_configs'
    })

    EmployeeConfigs.associate = (models) => {
        EmployeeConfigs.belongsTo(models.Employee, { as: 'employee', foreignKey: 'employee_id' });
    }

    return EmployeeConfigs
}