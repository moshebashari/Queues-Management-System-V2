'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const today = new Date();

    const employeeConfigsData = [{'employee_id': 1, 'booking_window' : JSON.stringify({unit: 'month' , amount: 1})}, 
      {'employee_id': 2, 'booking_window' : JSON.stringify({unit: 'week' , amount: 2})},
      {'employee_id': 3, 'booking_window' : JSON.stringify({unit: 'year' , amount: 1})},
    ]

    for (let i = 4; i <= 20; i++){
      employeeConfigsData.push({'employee_id': i})
    }

    const dataToAdd = employeeConfigsData.map(p => {
      return {
        ...p,
        created_at: today,
        updated_at: today
      }
    })

    await queryInterface.bulkInsert('employee_configs', dataToAdd, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('employee_configs', null, {});
  }
};
