'use strict';
const workingHoursData = require('../data/workingHours.json');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('working_hours', workingHoursData, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('working_hours', null, {});
  }
};
