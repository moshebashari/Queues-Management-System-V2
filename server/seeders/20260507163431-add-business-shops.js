'use strict';
const businessShops = require('../data/businessShops.json');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const today = new Date();

    const businessToAdd = businessShops.map(p => {
      return {
        ...p,
        created_at: today,
        updated_at: today
      }
    })

    await queryInterface.bulkInsert('business_shops', businessToAdd, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('business_shops', null, {});
  }
};
