const { mysqlcon } = require("../model/db");

let ensured = false;

/** Listing + contact-reveal views for tutor-need posts (no formal migration). */
const ensureTutorNeedViewsTables = async () => {
  if (ensured) return;
  await mysqlcon.promise().query(`
    CREATE TABLE IF NOT EXISTS tutor_need_views (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tutor_id INT NOT NULL,
      viewer_id INT NULL,
      view_type VARCHAR(20) NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tutor_type (tutor_id, view_type),
      UNIQUE KEY uniq_tutor_viewer_type (tutor_id, viewer_id, view_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  ensured = true;
};

module.exports = { ensureTutorNeedViewsTables };
