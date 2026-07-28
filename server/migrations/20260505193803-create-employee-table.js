'use strict';
/** @type {import('sequelize-cli').Migration} */
const Employee = require('../models/Employee');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(Employee, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(Employee ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};