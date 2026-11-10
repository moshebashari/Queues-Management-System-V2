'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // הוספת האינדקס
    await queryInterface.addIndex(
      'appointments', // שם הטבלה ב-DB (בדרך כלל ברבים)
      ['uuid', 'access_token'], // מערך של העמודה או העמודות שעליהן תרצה את האינדקס
      {
        name: 'unique_token_per_uuid', // שם האינדקס (אופציונלי, אך מומלץ)
        unique: true // הופך את האינדקס לייחודי (אופציונלי)
      }
    );
  },

  async down (queryInterface, Sequelize) {
    // הסרת האינדקס במקרה של Rollback (ביטול המיגרציה)
    await queryInterface.removeIndex('appointments', 'unique_token_per_uuid');
  }
};