const {Sequelize} = require('sequelize');
const config = require('../config/config.json');
const env = process.env.NODE_ENV || "development"; // "development" , "test", "production"


const {password, username, database} = config[env];

const sequelize = new Sequelize(database, username, password, config[env]);


const getModelAttributes = (ModelInstance, Sequelize, DataTypes) => {
 const model = ModelInstance(Sequelize, DataTypes);
  return {
    tableName: model.getTableName(),
    attributes: model.getAttributes()
  }   
}


module.exports = {
    sequelize,
    getModelAttributes
}