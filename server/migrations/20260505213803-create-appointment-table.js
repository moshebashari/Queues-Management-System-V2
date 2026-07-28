'use strict';
/** @type {import('sequelize-cli').Migration} */
const Appointment = require('../models/Appointment');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(Appointment, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(Appointment ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};