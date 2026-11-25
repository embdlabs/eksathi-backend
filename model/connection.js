/* Sequelize connection details — prefer .env (DB*) over config.json */
require("dotenv").config();
const { Sequelize } = require("sequelize");
const { logg } = require("../utils/utils");
const dbConfig = require("../config/config.json");
const env = process.env.NODE_ENV || "development";
const raw = dbConfig[env] || dbConfig.development;

const database = process.env.DBNAME || raw.database;
const username = process.env.DBUSER || raw.username;
const password = process.env.DBPASS ?? raw.password;
const host = process.env.DBHOST || raw.host;

const sequelize = new Sequelize(database, username, password, {
  host,
  dialect: raw.dialect || "mysql",
});

(async function runSequelize() {
  try {
    await sequelize.authenticate();
    logg.success("Sequelize Connection Has Been Established Successfully.");
  } catch (error) {
    logg.info(process.env.DBNAME || database);
    logg.error("Unable to connect to the database:", error);
  }
})();

module.exports = sequelize;
