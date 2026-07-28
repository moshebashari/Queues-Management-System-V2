'use strict';
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('employees', 'appointment_duration', { // 'Users' is the table name
      type: Sequelize.INTEGER, // data type, e.g., STRING, INTEGER, BOOLEAN
      allowNull: false,
      defaultValue: 20
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('employees', 'appointment_duration');
  }
};