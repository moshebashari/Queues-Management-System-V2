const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const Employee = sequelize.define('Employee', {
        // id: {
        //     primaryKey: true,
        //     type: DataTypes.INTEGER,
        //     autoIncrement: true
        // },
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING(20),
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
        employeeNum: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        contactPhone: {
            allowNull: false,
            type: DataTypes.STRING(10),
            unique: true,
        },
        employeeCode: {
            allowNull: false,
            type: DataTypes.INTEGER
        }

    }, {
        indexes: [
            {
                unique: true,
                fields: ['business_id', 'empolyee_num']
            },
            {
                unique: true,
                fields: ['business_id', 'name'],
                name: 'business_name_idx'
            },
            {
                unique: true,
                fields: ['business_id', 'contact_phone'],
                name: 'business_phone_idx'
            },
            {
                unique: true,
                fields: ['business_id', 'employee_code'],
                name: 'uk_business_employee_code'
            }
        ],
        underscored: true,
        tableName: 'employees'
    })

    Employee.associate = (models) => {
        Employee.belongsTo(models.BusinessShop, { as: 'businessShop', foreignKey: 'business_id' });
        Employee.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
        Employee.hasMany(models.Appointment, { as: 'appointment', foreignKey: 'employee_id', targetKey: 'id' });
        Employee.hasMany(models.Shift, { as: 'shift', foreignKey: 'employee_id', targetKey: 'id' });
        Employee.hasMany(models.Break, { as: 'break', foreignKey: 'employee_id', targetKey: 'id' });
        Employee.hasOne(models.EmployeeConfigs, { as: 'employeeConfigs', foreignKey: 'employee_id', targetKey: 'id' });

    }

    return Employee
} 