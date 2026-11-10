const { sequelize } = require('../utils/database');
const bcrypt = require('bcrypt');

const ROLE_OPTIONS = ['admin', 'employee', 'client'];

module.exports = (s, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
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
        fullName: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        userName: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        phoneNumber: {
            allowNull: false,
            type: DataTypes.STRING(10),
        },
        role: {
            allowNull: false,
            type: DataTypes.STRING(10),
            defaultValue: 'available',
            validate: {
                isIn: {
                    args: [ROLE_OPTIONS],
                    msg: 'Role has to be one of the following: admin, employee, client'
                }
            }
        },
        password: {
            allowNull: false,
            type: DataTypes.STRING,
            set(value) {
                const saltRounds = 10;
                const hashedPassword = bcrypt.hashSync(value, saltRounds);
                this.setDataValue('password', hashedPassword);
            }
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['business_id', 'user_name'],
                name: 'business_name_idx'
            },
            {
                unique: true,
                fields: ['business_id', 'phone_number'],
                name: 'business_phone_idx'
            }
        ],
        defaultScope: {
            attributes: { exclude: ['password'] }
        },
        scopes: {
            withPassword: { attributes: {} }
        },
        underscored: true,
        tableName: 'users'
    })

    User.associate = (models) => {
        User.belongsTo(models.BusinessShop, { as: 'businessShop', foreignKey: 'business_id' });
        User.hasMany(models.Appointment, { as: 'appointment', foreignKey: 'user_id', targetKey: 'id' });
        User.hasMany(models.EmployeeBlockage, { as: 'employeeBlockage', foreignKey: 'user_id', targetKey: 'id' });
        User.hasOne(models.Permissions, { as: 'permissions', foreignKey: 'user_id', targetKey: 'id' });
        User.hasOne(models.Employee, { as: 'employee', foreignKey: 'user_id', targetKey: 'id' });
    }

    return User
}