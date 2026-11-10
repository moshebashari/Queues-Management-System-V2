'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. מכבים זמנית את בדיקת המפתחות הזרים
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. מבצעים את השינוי של ה-id ל-autoIncrement
    await queryInterface.changeColumn('users', 'id', {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false
    });

    // 3. מדליקים חזרה את הבדיקה (חובה!)
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    await queryInterface.changeColumn('users', 'id', {
      type: Sequelize.INTEGER,
      autoIncrement: false,
      allowNull: false
    });

    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  }
};
