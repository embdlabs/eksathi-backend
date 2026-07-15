const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  "eksathi-testing", // DB name (update if needed)
  "eksathi", // MySQL username
  "VeLIgrEwCAlu", // MySQL password
  {
    host: "eksathi.czwgmkqssbpx.ap-south-1.rds.amazonaws.com", // or your DB host
    dialect: "mysql",
    logging: console.log, // log all SQL queries
  }
);

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connection established.");

    // Show current database
    const [db] = await sequelize.query("SELECT DATABASE() AS db;");
    console.log("📌 Connected Database:", db[0].db);

    // Show columns of users table
    const [columns] = await sequelize.query("SHOW COLUMNS FROM users;");
    console.log("📋 Users Table Schema:");
    console.table(columns);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
