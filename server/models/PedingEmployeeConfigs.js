const { truncate } = require('lodash');
const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const PendingEmployeeConfigs = sequelize.define('PendingEmployeeConfigs', {
        id: {
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        employeeId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'employees',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            allowNull: false
        },
        configName: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        configValue: {
            type: DataTypes.JSON,
            allowNull: false
        },
        effectiveDate: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: "pending_employee_configs",
        underscored: true,
        timestamps: true,

        indexes: [
            {fields: ['effective_date']},
            {
                fields: ['employee_id', 'config_name', 'effective_date'], 
                name: "idx_employee_config_name_date", 
                unique: true
            }
        ]


    })

    return PendingEmployeeConfigs
}