'use strict';
/** @type {import('sequelize-cli').Migration} */
const User = require('../models/User');
const {DataTypes, Sequelize} = require('sequelize');
const {getModelAttributes} = require('../utils/database');

module.exports = {
  async up(queryInterface) {
      const {tableName, attributes} = getModelAttributes(User, Sequelize, DataTypes)
      await queryInterface.createTable(tableName, attributes);

      await queryInterface.addIndex(
      'users', // שם הטבלה ב-DB (בדרך כלל ברבים)
      ['business_id', 'user_name'], // מערך של העמודה או העמודות שעליהן תרצה את האינדקס
      {
        name: 'business_name_idx', // שם האינדקס (אופציונלי, אך מומלץ)
        unique: true // הופך את האינדקס לייחודי (אופציונלי)
      }

    );
    await queryInterface.addIndex(
      'users', // שם הטבלה ב-DB (בדרך כלל ברבים)
      ['business_id', 'phone_number'], // מערך של העמודה או העמודות שעליהן תרצה את האינדקס
      {
        name: 'business_phone_idx', // שם האינדקס (אופציונלי, אך מומלץ)
        unique: true // הופך את האינדקס לייחודי (אופציונלי)
      }

    );
  },
  async down(queryInterface, Sequelize) {
    const {tableName} = getModelAttributes(User ,Sequelize, DataTypes);
    await queryInterface.dropTable(tableName);
  }
};