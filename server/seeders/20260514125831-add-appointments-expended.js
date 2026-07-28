'use strict';
const appointmentsData = require('../data/appointmentsExpended.json');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const today = new Date();

    const dataToAdd = appointmentsData.map(p => {
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

    }catch (err){
      console.log(err)
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('appointments', null, {});
  }
};
