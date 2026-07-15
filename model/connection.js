/* Sequalize connection details */
const { Sequelize, DataTypes } = require("sequelize");
const { logg } = require("../utils/utils");
const config=require('../config/config')
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: "mysql",
  }
);
(async function runSequelize() {
  try {
    await sequelize.authenticate();
    logg.success("Sequelize Connection Has Been Established Successfully.");
  } catch (error) {
    logg.info(process.env.DBNAME);
    logg.error("Unable to connect to the database:", error);
  }
})();

module.exports = sequelize;
