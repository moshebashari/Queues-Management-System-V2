'use strict';
/** @type {import('sequelize-cli').Migration} */
const Shifts = require('../models/Shifts');
const { DataTypes, Sequelize } = require('sequelize');
const { getModelAttributes } = require('../utils/database');

module.exports = {
  async up(queryInterface) {
    const { tableName, attributes } = getModelAttributes(Shifts, Sequelize, DataTypes)
    await queryInterface.createTable(tableName, attributes);

    await queryInterface.addIndex(
      'shifts', // שם הטבלה ב-DB (בדרך כלל ברבים)
      ['employee_id', 'day_of_week'], // מערך של העמודה או העמודות שעליהן תרצה את האינדקס
      {
        name: "inx_day_employee",
        unique: true
      }
    );
  },
  async down(queryInterface, Sequelize) {
    const { tableName } = getModelAttributes(Shifts, Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};