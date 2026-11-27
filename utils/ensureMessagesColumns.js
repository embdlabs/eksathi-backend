const { mysqlcon } = require("../model/db");

let ensured = false;

/**
 * messages.is_read — used for DM unread badges / mark-read on room open.
 * Older VPS DBs may lack the column (Sequelize model expects it).
 * No formal migration — ALTER IF missing only.
 */
const ensureMessagesColumns = async () => {
  if (ensured) return;
  try {
    const [cols] = await mysqlcon.promise().query(
      `SHOW COLUMNS FROM messages LIKE 'is_read'`
    );
    if (!cols?.length) {
      await mysqlcon.promise().query(
        `ALTER TABLE messages
         ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0
         AFTER receiver_institute_id`
      );
      console.log("[ensureMessagesColumns] Added messages.is_read");
    }
    ensured = true;
  } catch (err) {
    console.error("ensureMessagesColumns:", err?.message || err);
    // Do not set ensured — retry next request
  }
};

module.exports = { ensureMessagesColumns };
