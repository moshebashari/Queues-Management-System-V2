'use strict';
/** @type {import('sequelize-cli').Migration} */
const Permissions = require('../models/Permissions');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(Permissions, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);
  },

  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(Permissions ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};