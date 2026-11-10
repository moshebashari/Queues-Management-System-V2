'use strict';
const { Appointment } = require('../models');
const { generateSlots } = require('../utils/generateSlots');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const slots = await generateSlots(1)

    // const cleanArray = Array.from(slots);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of slots) {
      try {
        // המודל יוצר לבד UUID ותאריכים, ואנחנו מכניסים שורה שורה
        await Appointment.create(row);
        insertedCount++;
      } catch (error) {
        // אם השורה כבר קיימת (Unique Constraint) - דלג בשקט לשורה הבאה
        if (error.name === 'SequelizeUniqueConstraintError' || error.message.includes('Duplicate entry')) {
          skippedCount++;
          continue;
        }
        // אם יש שגיאת תוקף (Validation) או שגיאה אמיתית אחרת, נרצה לראות אותה
        console.error(`שגיאה בהכנסת שורה:`, error.message);
        throw error;
      }
    }

    console.log(`=== סיכום ריצה: הוכנסו ${insertedCount} שורות חדשות, נדלגו ${skippedCount} שורות כפולות ===`);

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('appointments', null, {});
  }
};
