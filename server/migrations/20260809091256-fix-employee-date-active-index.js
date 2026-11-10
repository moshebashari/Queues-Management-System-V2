'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. יצירת אינדקס רגיל וזמני על ה-Foreign Key כדי ש-MySQL יאפשר לנו למחוק את האינדקס הייחודי
    await queryInterface.addIndex('appointments', {
      fields: ['employee_id'],
      name: 'tmp_employee_fk_idx'
    });

    // 2. מחיקת האינדקס הישן והשגוי
    await queryInterface.removeIndex('appointments', 'idx_employee_date_active');

    // 3. יצירת האינדקס הייחודי והמתוקן ('cancelled' בגרש בודד)
    await queryInterface.addIndex('appointments', {
      name: 'idx_employee_date_active',
      unique: true,
      fields: [
        'employee_id',
        'appointment_date_time',
        Sequelize.literal("(case when `status` != 'cancelled' then 1 else null end)")
      ]
    });

    // 4. מחיקת האינדקס הזמני שפתחנו, מאחר והאינדקס החדש כבר מחסה ומגבה את ה-Foreign Key
    await queryInterface.removeIndex('appointments', 'tmp_employee_fk_idx');
  },

  down: async (queryInterface, Sequelize) => {
    // תהליך הפוך לחלוטין למקרה של ביצוע Rollback (down)
    await queryInterface.addIndex('appointments', {
      fields: ['employee_id'],
      name: 'tmp_employee_fk_idx'
    });

    await queryInterface.removeIndex('appointments', 'idx_employee_date_active');

    await queryInterface.addIndex('appointments', {
      name: 'idx_employee_date_active',
      unique: true,
      fields: [
        'employee_id',
        'appointment_date_time',
        Sequelize.literal("(case when `status` != `cancelled` then 1 else null end)")
      ]
    });

    await queryInterface.removeIndex('appointments', 'tmp_employee_fk_idx');
  }
};
