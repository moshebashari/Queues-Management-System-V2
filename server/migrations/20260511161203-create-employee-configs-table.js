'use strict';
/** @type {import('sequelize-cli').Migration} */
const EmployeeConfigs = require('../models/EmployeeConfigs');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(EmployeeConfigs, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(EmployeeConfigs ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};