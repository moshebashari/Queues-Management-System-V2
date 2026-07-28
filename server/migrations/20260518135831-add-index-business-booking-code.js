'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // הוספת האינדקס
    await queryInterface.addIndex(
      'appointments', // שם הטבלה ב-DB (בדרך כלל ברבים)
      ['business_id', 'booking_code'], // מערך של העמודה או העמודות שעליהן תרצה את האינדקס
      {
        name: 'unique_code_per_business', // שם האינדקס (אופציונלי, אך מומלץ)
        unique: true // הופך את האינדקס לייחודי (אופציונלי)
      }
    );
  },

  async down (queryInterface, Sequelize) {
    // הסרת האינדקס במקרה של Rollback (ביטול המיגרציה)
    await queryInterface.removeIndex('appointments', 'unique_code_per_business');
  }
};