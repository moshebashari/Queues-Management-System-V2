'use strict';
const crypto = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. שליפת ה-uuid של כל התורים בסטטוס booked
    const [bookedAppointments] = await queryInterface.sequelize.query(
      `SELECT uuid FROM \`appointments\` WHERE status = 'booked';`
    );

    console.log(`נמצאו ${bookedAppointments.length} תורים לעדכון.`);

    // 2. עדכון בלולאה לפי ה-uuid של כל תור
    for (const appointment of bookedAppointments) {
      const secureToken = crypto.randomBytes(32).toString('hex');

      await queryInterface.bulkUpdate(
        'appointments',
        { access_token: secureToken },
        { uuid: appointment.uuid } // עדכון לפי עמודת uuid
      );
    }

    console.log('כל התורים התפוסים עודכנו בהצלחה עם access_token!');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      'appointments',
      { access_token: null },
      { status: 'booked' }
    );
  }
};