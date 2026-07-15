// const { config } = require("aws-sdk");
// var mysql = require("mysql2");
// const {Sequelize} = require("sequelize")
// require("dotenv").config()

// var mysqlcon = mysql.createPool({
//   connectionLimit: 10,
//   host: process.env.DBHOST,
//   user: process.env.DBUSER,
//   password: process.env.DBPASS,
//   database: process.env.DBNAME,
// });
// mysqlcon.getConnection((err, connection) => {
//   if (err) {
//     console.error("Error connecting to database:", err);
//     return;
//   }
//   console.log("Database connected");
//   connection.release(); // Release the connection when done
// });

// const { DBNAME,DBHOST,DBPASS,DBUSER} = process.env

// const configDB = {
//   host:DBHOST,
//   port:3306,
//   dialect:'mysql'
// }

// const sequelize = new Sequelize(DBNAME,DBUSER,DBPASS,configDB)

// module.exports = {
//   mysqlcon,
//   sequelize,
// };



const mysql = require("mysql2");
const { Sequelize } = require("sequelize");
require("dotenv").config();

const dbConfig = require("../config/config.json");
const env = process.env.NODE_ENV || "development";
const config = dbConfig[env] || dbConfig.development;

const poolConfig = {
  connectionLimit: 10,
  host: process.env.DBHOST || config.host,
  user: process.env.DBUSER || config.username,
  password: process.env.DBPASS ?? config.password,
  database: process.env.DBNAME || config.database,
};

// Create regular pool
const mysqlcon = mysql.createPool(poolConfig);

// Create promise wrapper for the pool
const mysqlpromise = mysqlcon.promise();

mysqlcon.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }
  console.log("Database connected");
  connection.release();
});

const { DBNAME, DBHOST, DBPASS, DBUSER } = {
  DBHOST: poolConfig.host,
  DBUSER: poolConfig.user,
  DBPASS: poolConfig.password,
  DBNAME: poolConfig.database,
};

const configDB = {
  host: DBHOST,
  port: 3306,
  dialect: "mysql",
};

const sequelize = new Sequelize(DBNAME, DBUSER, DBPASS, configDB);

module.exports = {
  mysqlcon,        // Original callback-based pool
  mysqlpromise,    // Promise-based wrapper
  sequelize,
};