'use strict';
/** @type {import('sequelize-cli').Migration} */
const Break = require('../models/Break');
const { DataTypes, Sequelize } = require('sequelize');
const { getModelAttributes } = require('../utils/database');

module.exports = {
  async up(queryInterface) {
    const { tableName, attributes } = getModelAttributes(Break, Sequelize, DataTypes)
    await queryInterface.createTable(tableName, attributes);

  },
  async down(queryInterface, Sequelize) {
    const { tableName } = getModelAttributes(Break, Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};