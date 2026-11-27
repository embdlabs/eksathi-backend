const { mysqlcon } = require("../model/db");

/** Local-only ensure: optional comment text on ratings rows. */
async function ensureRatingCommentColumn() {
  try {
    const [rows] = await mysqlcon.promise().query(
      `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'ratings'
         AND COLUMN_NAME = 'comment'`
    );
    if (Number(rows?.[0]?.c) === 0) {
      await mysqlcon.promise().query(
        `ALTER TABLE ratings
         ADD COLUMN comment VARCHAR(300) NULL AFTER rating`
      );
      console.log("[ratings] Added ratings.comment");
    }
  } catch (err) {
    console.error("[ratings] ensureRatingCommentColumn:", err.message);
  }
}

module.exports = { ensureRatingCommentColumn };
