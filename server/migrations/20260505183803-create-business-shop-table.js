'use strict';
/** @type {import('sequelize-cli').Migration} */
const BusinessShop = require('../models/BusinessShop');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(BusinessShop, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(BusinessShop ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};