'use strict';
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('employees', 'user_id', { // 'Users' is the table name
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      defaultValue: null
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('employees', 'user_id');
  }
};