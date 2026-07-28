'use strict';
const employessData = require('../data/employees.json');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const today = new Date();

    const dataToAdd = employessData.map(p => {
      return {
        ...p,
        created_at: today,
        updated_at: today
      }
    })

    await queryInterface.bulkInsert('employees', dataToAdd, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('employees', null, {});
  }
};
