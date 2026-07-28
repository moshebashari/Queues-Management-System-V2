'use strict';
const appointmentsDataAll = require('../data/allAppointments.json');
const appointmentsData = require('../data/appointmentsExpended.json');

/** @type {import('sequelize-cli').Migration} */



module.exports = {

  async up(queryInterface, Sequelize) {
    const appointmentsToRemove = new Set(
      appointmentsData.map(item => `${item.employee_id}_${item.appointment_date_time}`)
    );

    // 2. סינון המערך הראשון
    const result = appointmentsDataAll.filter(item => {
      // יוצרים את אותו שילוב עבור האובייקט הנוכחי במערך הראשון
      const currentKey = `${item.employee_id}_${item.appointment_date_time}`;

      // משאירים רק אם השילוב הזה לא קיים ב-Set
      return !appointmentsToRemove.has(currentKey);
    });
    const today = new Date();

    const dataToAdd = result.map(p => {
      const dateFormat = new Date(p.appointment_date_time);
      return {
        ...p,
        appointment_date_time: dateFormat,
        created_at: today,
        updated_at: today
      }
    })
    try {
      await queryInterface.bulkInsert('appointments', dataToAdd, {});

    } catch (err) {
      console.log(err)
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('appointments', null, {});
  }
};
