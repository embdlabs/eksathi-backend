const { mysqlcon } = require("../model/db");

let ensured = false;

/** Hide state + admin connection-request blocks without formal migrations. */
const ensureConnectionPrivacyTables = async () => {
  if (ensured) return;
  await mysqlcon.promise().query(`
    CREATE TABLE IF NOT EXISTS connection_hides (
      connection_id INT NOT NULL PRIMARY KEY,
      hidden_by INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_hidden_by (hidden_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await mysqlcon.promise().query(`
    CREATE TABLE IF NOT EXISTS connection_blocks (
      user_id INT NOT NULL PRIMARY KEY,
      blocked_by_admin INT NULL,
      reason VARCHAR(255) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  ensured = true;
};

const getHideForConnection = async (connectionId) => {
  await ensureConnectionPrivacyTables();
  const [rows] = await mysqlcon.promise().query(
    `SELECT connection_id, hidden_by, createdAt FROM connection_hides WHERE connection_id = ? LIMIT 1`,
    [connectionId]
  );
  return rows[0] || null;
};

const isUserConnectionBlocked = async (userId) => {
  await ensureConnectionPrivacyTables();
  const [rows] = await mysqlcon.promise().query(
    `SELECT user_id FROM connection_blocks WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
};

/** Hide info between two users if an accepted connection is hidden. */
const getHideBetweenUsers = async (userA, userB) => {
  await ensureConnectionPrivacyTables();
  const [rows] = await mysqlcon.promise().query(
    `SELECT c.id AS connection_id, c.status, h.hidden_by, h.createdAt AS hidden_at
     FROM connections c
     LEFT JOIN connection_hides h ON h.connection_id = c.id
     WHERE ((c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?))
       AND c.status = 'accepted'
     LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return rows[0] || null;
};

module.exports = {
  ensureConnectionPrivacyTables,
  getHideForConnection,
  isUserConnectionBlocked,
  getHideBetweenUsers,
};
