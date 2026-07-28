const { literal } = require('sequelize');
const { sequelize } = require('../utils/database');

const APPOINTMENT_STATUSES = ['available', 'pending', 'confirmed', 'completed', 'cancelled'];

module.exports = (s, DataTypes) => {
    const Appointment = sequelize.define('Appointment', {
        uuid: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
        },
        bookingCode: {
            allowNull: false,
            type: DataTypes.INTEGER,
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
        appointmentDateTime: {
            allowNull: false,
            type: DataTypes.DATE,
            // get() {
            //     const rawValue = this.getDataValue('appointmentDateTime');
            //     if (!rawValue) return null;

            //     // שימוש ב-'en-GB' מבטיח אפס מוביל בשעות, דקות ושניות
            //     // שימוש ב-'Asia/Jerusalem' מבטיח המרה מדויקת לשעון ישראל מהשרת בחו"ל
            //     const israelTimeString = new Date(rawValue).toLocaleTimeString('en-GB', {
            //         timeZone: 'Asia/Jerusalem',
            //         hour12: false
            //     });

            //     return israelTimeString;
            // }
        },
        contactPhone: {
            allowNull: true,
            type: DataTypes.STRING(10),
        },
        name: {
            type: DataTypes.STRING(20)
        },
        bookingPhone: {
            allowNull: true,
            type: DataTypes.STRING(10),
        },
        status: {
            allowNull: false,
            type: DataTypes.STRING(20),
            defaultValue: 'available',
            validate: {
                isIn: {
                    args: [APPOINTMENT_STATUSES],
                    msg: 'Status has to be one of the following: pending, confirmed, completed, cancelled'
                }
            }
        },
        hasNotifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        reminderOptions: {
            type: DataTypes.JSON,
            allowNull: true,
        }


    }, {
        indexes: [
            { fields: ['uuid'] },
            { unique: true, fields: ['business_id', 'booking_code'], name: 'unique_code_per_business' },
            { fields: ['appointment_date_time'] },
            { fields: ['has_notifications'] },
            { fields: ['business_id'] },
            { fields: ['empolyee_id'] },
            {
                name: 'idx_employee_date_active', unique: true,
                fields: [
                    'employee_id',
                    'appointment_date_time',
                    literal("(case when `status` != `cancelled` then 1 else null end)")
                ]
            }
        ],
        timestamps: true,
        underscored: true,
        tableName: 'appointments',
        hooks: {
            beforeValidate: (app, options) => {
                if (!app.contactPhone) {
                    app.contactPhone = app.bookingPhone;
                }
            }
        }
    })

    Appointment.associate = (models) => {
        Appointment.belongsTo(models.BusinessShop, { as: 'businessShop', foreignKey: 'business_id' });
        Appointment.belongsTo(models.Employee, { as: 'employee', foreignKey: 'employee_id' });
    }



    return Appointment
}