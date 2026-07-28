const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const BusinessShop = sequelize.define('BusinessShop', {
        id: {
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        uuid: {
            allowNull: false,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true
        },
        name: {
            allowNull: false,
            unique: true,
            type: DataTypes.STRING
        },
        ownerName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        whatsappPhone: {
            type: DataTypes.STRING(10),
        },
        ivrPhone: {
            type: DataTypes.STRING(10),
        }

    }, {
        validate: {
            atleastOne() {
                if (!this.whatsappPhone && !this.voicePhone) {
                    throw new Error('At least one of the following fields is required: whatsappPhone or voicePhone')
                }
            }
        },
        underscored: true,
        tableName: 'business_shops'
    })

    BusinessShop.associate = (models) => {
        BusinessShop.hasMany(models.Employee, { as: 'employee', foreignKey: 'business_id', targetKey: 'id' });
        BusinessShop.hasMany(models.WorkingHours, { as: 'workingHours', foreignKey: 'business_id', targetKey: 'id' });
        BusinessShop.hasMany(models.Appointment, { as: 'appointment', foreignKey: 'business_id', targetKey: 'id' });
        BusinessShop.hasOne(models.BusinessSettings, {as: 'businessSettings', foreignKey: 'business_id', targetKey: 'id'})
    }

    return BusinessShop;
}