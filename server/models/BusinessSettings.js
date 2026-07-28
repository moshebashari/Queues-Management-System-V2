const { sequelize } = require('../utils/database');

const REMINDER_TIMES = ['none', '24h', 'evening', 'morning', 'customer_choice'];

const NOTIFICTION_CHANNELS = ['none', 'sms', 'voice_call'];

module.exports = (s, DataTypes) => {
    const BusinessSettings = sequelize.define('BusinessSettings', {
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'business_shops',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        reminderTime: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'none',
            validate: {
                isIn: {
                    args: [REMINDER_TIMES],
                    msg: 'Reminder time has to be one of the following: none, 24h, evening, morning, customer_choice'
                }
            }
        },
        notifictionChannel: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: ['none'],
            validate: {
                // ולידציה מותאמת אישית לוודא שכל הערוצים במערך תקינים
                isValidChannelArray(value) {
                    if (!Array.isArray(value)) {
                        throw new Error('הערוצים חייבים להישמר כמערך');
                    }
                    const hasInvalid = value.some(channel => !NOTIFICTION_CHANNELS.includes(channel));
                    if (hasInvalid) {
                        throw new Error('אחד או יותר מערוצי ההתראה שנבחרו אינם תקינים');
                    }
                }
            }
        }
    }, {
        underscored: true,
        tableName: 'business_settings'
    })

    BusinessSettings.associate = (models) => {
        BusinessSettings.belongsTo(models.BusinessShop, { as: 'businessShop', foreignKey: 'business_id' })
    }

    return BusinessSettings;
}