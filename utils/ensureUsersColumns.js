const { mysqlcon } = require("../model/db");

let ensured = false;

/**
 * Additive users.phone_verified — Sequelize model expects it; older VPS DBs may not have it.
 * No formal migration — ALTER IF missing only.
 */
const ensureUsersColumns = async () => {
  if (ensured) return;
  try {
    const [cols] = await mysqlcon.promise().query(
      `SHOW COLUMNS FROM users LIKE 'phone_verified'`
    );
    if (!cols?.length) {
      try {
        await mysqlcon.promise().query(
          `ALTER TABLE users
           ADD COLUMN phone_verified TINYINT(1) NOT NULL DEFAULT 0
           AFTER is_verified`
        );
      } catch (_) {
        await mysqlcon.promise().query(
          `ALTER TABLE users
           ADD COLUMN phone_verified TINYINT(1) NOT NULL DEFAULT 0`
        );
      }
      console.log("[ensureUsersColumns] Added users.phone_verified");
    }
    ensured = true;
  } catch (err) {
    console.error("ensureUsersColumns:", err?.message || err);
  }
};

module.exports = { ensureUsersColumns };
