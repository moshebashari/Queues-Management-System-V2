'use strict';
const appointmentsData = require('../data/appointments.json');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const today = new Date();

    const dataToAdd = appointmentsData.map(p => {
      return {
        ...p,
        created_at: today,
        updated_at: today
      }
    })

    await queryInterface.bulkInsert('appointments', dataToAdd, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('appointments', null, {});
  }
};
