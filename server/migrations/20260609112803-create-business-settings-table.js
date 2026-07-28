'use strict';
/** @type {import('sequelize-cli').Migration} */
const BusinessSettings = require('../models/BusinessSettings');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(BusinessSettings, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);
      
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(BusinessSettings ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};