const { sequelize } = require('../utils/database');

module.exports = (s, DataTypes) => {
    const Break = sequelize.define('Break', {
        id: {
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        shiftId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'shifts',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        employeeId: {
            type: DataTypes.INTEGER,
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
        underscored: true,
        tableName: 'breaks'
    })

    Break.associate = (models) => {
        Break.belongsTo(models.Employee, { as: 'employee', foreignKey: 'employee_id' });
        Break.belongsTo(models.Shift, {as: 'shift', foreignKey: 'shift_id'})
    }

    return Break
}