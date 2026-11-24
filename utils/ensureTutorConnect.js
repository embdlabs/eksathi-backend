const { mysqlcon } = require("../model/db");

let ensured = false;

const addColumnIfMissing = async (column, ddl) => {
  const [cols] = await mysqlcon.promise().query(
    `SHOW COLUMNS FROM tutors LIKE ?`,
    [column]
  );
  if (!cols?.length) {
    await mysqlcon.promise().query(ddl);
  }
};

/**
 * Tutor-need connect: open default status, requester, and owner user id.
 * No formal migration — ALTER IF missing only.
 */
const ensureTutorConnectDefaults = async () => {
  if (ensured) return;
  try {
    await addColumnIfMissing(
      "requester_id",
      `ALTER TABLE tutors ADD COLUMN requester_id INT NULL DEFAULT NULL`
    );
    await addColumnIfMissing(
      "posted_by_user_id",
      `ALTER TABLE tutors ADD COLUMN posted_by_user_id INT NULL DEFAULT NULL`
    );

    // Link rows to accounts by email when possible
    await mysqlcon.promise().query(
      `UPDATE tutors t
       INNER JOIN users u ON LOWER(TRIM(u.email)) = LOWER(TRIM(t.email))
       SET t.posted_by_user_id = u.id
       WHERE t.posted_by_user_id IS NULL`
    );

    // Legacy rows defaulted to pending with nobody requesting — open them
    const [upd] = await mysqlcon.promise().query(
      `UPDATE tutors
       SET connectionStatus = 'process', requester_id = NULL
       WHERE connectionStatus = 'pending'
         AND (requester_id IS NULL OR requester_id = 0)`
    );
    if (upd?.affectedRows > 0) {
      try {
        const { deleteFromCache } = require("./catch-manage");
        deleteFromCache("lists", "tutor_list_valid_7d");
        deleteFromCache("lists", "tutor_list");
      } catch (_) {
        /* ignore */
      }
    }
  } catch (err) {
    console.error("ensureTutorConnectDefaults:", err?.message || err);
  }
  ensured = true;
};

module.exports = { ensureTutorConnectDefaults };
