'use strict';
/** @type {import('sequelize-cli').Migration} */
const EmployeeBlockage = require('../models/EmployeeBlockage');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(EmployeeBlockage, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);

      await queryInterface.addIndex(
      'employee_blockages', // שם הטבלה ב-DB (בדרך כלל ברבים)
      ['user_id', 'status', 'start_time', 'end_time'], // מערך של העמודה או העמודות שעליהן תרצה את האינדקס
      {
        name: 'idx_blockages_employee_status_datetime', // שם האינדקס (אופציונלי, אך מומלץ)
      }

    );
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(EmployeeBlockage ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};