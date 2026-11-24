const { mysqlcon } = require("../model/db");

let ensured = false;

const ensureProfileViewsTables = async () => {
  if (ensured) return;
  await mysqlcon.promise().query(`
    CREATE TABLE IF NOT EXISTS profile_views (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      viewer_id INT NOT NULL,
      viewed_id INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_viewed (viewed_id, createdAt),
      INDEX idx_viewer_viewed (viewer_id, viewed_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await mysqlcon.promise().query(`
    CREATE TABLE IF NOT EXISTS profile_view_prefs (
      user_id INT NOT NULL PRIMARY KEY,
      show_viewers TINYINT(1) NOT NULL DEFAULT 1,
      anonymous_browsing TINYINT(1) NOT NULL DEFAULT 0,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  ensured = true;
};

module.exports = { ensureProfileViewsTables };
