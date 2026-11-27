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
const dropUniqueEmailIndexes = async () => {
  // Logged-in users may post multiple tutor-needs with the same account email.
  // Old schema had UNIQUE(email) which makes POST /app/tutor return 500 (ER_DUP_ENTRY).
  const [indexes] = await mysqlcon.promise().query(
    `SHOW INDEX FROM tutors WHERE Column_name = 'email' AND Non_unique = 0`
  );
  const seen = new Set();
  for (const idx of indexes || []) {
    const key = idx.Key_name;
    if (!key || key === "PRIMARY" || seen.has(key)) continue;
    seen.add(key);
    try {
      await mysqlcon.promise().query(`ALTER TABLE tutors DROP INDEX \`${key}\``);
      console.log(`[ensureTutorConnect] Dropped unique index ${key} on tutors.email`);
    } catch (err) {
      console.error(
        `[ensureTutorConnect] drop index ${key}:`,
        err?.message || err
      );
    }
  }
};

const ensureTutorConnectDefaults = async () => {
  // Always safe to re-check unique email indexes (SHOW INDEX is cheap).
  // Columns/backfill only run once per process when successful.
  try {
    await dropUniqueEmailIndexes();
  } catch (err) {
    console.error("ensureTutorConnectDefaults dropUnique:", err?.message || err);
  }

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
    ensured = true;
  } catch (err) {
    console.error("ensureTutorConnectDefaults:", err?.message || err);
    // Do not set ensured — retry next request
  }
};

module.exports = { ensureTutorConnectDefaults };
