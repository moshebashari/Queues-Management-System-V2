'use strict';
const usersData = require('../data/users.json');
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    const today = new Date();


    const dataToAdd = [];
    for (let user of usersData) {
      const newUser = {...user}
      const saltRounds = 10; // רמת חוזק ההצפנה (10 זה הסטנדרט)
      newUser.password = await bcrypt.hash(newUser.password, saltRounds);
      newUser.created_at = today;
      newUser.updated_at = today;
      dataToAdd.push(newUser)
    }
    // const dataToAdd = usersData.map(async p => {
    //   const saltRounds = 10; // רמת חוזק ההצפנה (10 זה הסטנדרט)
    //   p.password = await bcrypt.hash(p.password, saltRounds);
    //   return {
    //     ...p,
    //     created_at: today,
    //     updated_at: today
    //   }
    // })
    try {
      await queryInterface.bulkInsert('users', dataToAdd, {});

    } catch (err) {
      console.log(err)
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
