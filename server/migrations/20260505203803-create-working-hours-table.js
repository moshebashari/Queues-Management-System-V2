'use strict';
/** @type {import('sequelize-cli').Migration} */
const WorkingHours = require('../models/WorkingHours');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(WorkingHours, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(WorkingHours ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};