'use strict';
const shiftsData = require('../data/shifts.json');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('shifts', shiftsData, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('shifts', null, {});
  }
};
