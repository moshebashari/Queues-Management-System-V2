'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // הוספת האינדקס
    await queryInterface.addIndex(
      'employees', // שם הטבלה ב-DB (בדרך כלל ברבים)
      ['business_id', 'contact_phone'], // מערך של העמודה או העמודות שעליהן תרצה את האינדקס
      {
        name: 'business_phone_idx', // שם האינדקס (אופציונלי, אך מומלץ)
        unique: true // הופך את האינדקס לייחודי (אופציונלי)
      }
    );
  },

  async down (queryInterface, Sequelize) {
    // הסרת האינדקס במקרה של Rollback (ביטול המיגרציה)
    await queryInterface.removeIndex('employees', 'business_phone_idx');
  }
};