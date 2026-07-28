'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // יצירת אינדקס ייחודי מותנה:
    // האינדקס יחול על עובד ותאריך, אבל MySQL יתעלם לחלוטין משורות שהן 'cancelled'.
    // זה יאפשר ביטולים מרובים, אבל רק תור פעיל אחד בכל פעם!
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX idx_employee_date_active 
      ON \`appointments\` (\`employee_id\`, \`appointment_date_time\`, (CASE WHEN \`status\` != 'cancelled' THEN 1 ELSE NULL END));
    `);
  },

  async down (queryInterface, Sequelize) {
    // פקודה לביטול המיגרציה במידת הצורך
    await queryInterface.sequelize.query(`
      ALTER TABLE \`Queues\` DROP INDEX idx_employee_date_active;
    `);
  }
};