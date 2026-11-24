const { mysqlcon } = require("../model/db");

let ensured = false;

/** Create emoji_reactions if missing (local/hosting-safe, no migration file). */
const ensureEmojiTable = async () => {
  if (ensured) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS emoji_reactions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      question_id INT NOT NULL,
      emoji VARCHAR(32) NOT NULL,
      emoji_unified VARCHAR(64) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deletedAt DATETIME NULL,
      INDEX idx_emoji_q (question_id),
      INDEX idx_emoji_u (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  await mysqlcon.promise().query(sql);
  ensured = true;
};

module.exports = { ensureEmojiTable };
