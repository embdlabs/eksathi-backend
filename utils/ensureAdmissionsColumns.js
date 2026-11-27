const { mysqlcon } = require("../model/db");

let ensured = false;

/**
 * Additive admissions enrollment columns — Sequelize model expects them;
 * older VPS DBs (and eksathi-production.sql dump) may not have them.
 * No formal migration — ALTER IF missing only.
 */
const ensureAdmissionsColumns = async () => {
  if (ensured) return;
  try {
    const [isEnrolled] = await mysqlcon.promise().query(
      `SHOW COLUMNS FROM admissions LIKE 'is_enrolled'`
    );
    if (!isEnrolled?.length) {
      await mysqlcon.promise().query(
        `ALTER TABLE admissions
         ADD COLUMN is_enrolled TINYINT(1) NOT NULL DEFAULT 0
         AFTER course_type`
      );
      console.log("[ensureAdmissionsColumns] Added admissions.is_enrolled");
    }

    const [enrollUserId] = await mysqlcon.promise().query(
      `SHOW COLUMNS FROM admissions LIKE 'enroll_user_id'`
    );
    if (!enrollUserId?.length) {
      await mysqlcon.promise().query(
        `ALTER TABLE admissions
         ADD COLUMN enroll_user_id JSON NULL
         AFTER is_enrolled`
      );
      console.log("[ensureAdmissionsColumns] Added admissions.enroll_user_id");
    }

    ensured = true;
  } catch (err) {
    console.error("ensureAdmissionsColumns:", err?.message || err);
  }
};

module.exports = { ensureAdmissionsColumns };
