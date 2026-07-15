const { mysqlcon } = require("../model/db");


const createReport = async (req, res) => {
    // Create a new report of questions, answers, comments and replies
    const { user_id, item_id, item_type, reason, comment } = req.body;

    if (!user_id || !item_id || !item_type || !reason || !comment) {
        return res.status(409).json({ message: 'Invalid email or Item ID or Item Type or comment' });
    }

    try {

        const sql = `
        INSERT INTO reports (user_id, item_id, item_type, reason, comment)
        VALUES (?, ?, ?, ?, ?)
        `;
        mysqlcon.query(sql, [user_id, item_id, item_type, reason, comment], (err, result) => {
            if (err) {
                console.error('Error creating report:', err.stack);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            res.status(201).json({ message: 'Report created successfully' });
        });
    } catch (error) {
        console.error('Error creating report:', error);
    }
}

const getReports = async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(409).json({ message: 'Invalid user' });
    }
    try {
        
        const sql = `SELECT * FROM reports WHERE user_id = ?`;
        mysqlcon.query(sql, [userId], (err, result) => {
            if (err) {
                console.error('Error getting reports:', err.stack);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            console.log(result);
            res.status(200).json({
                message: 'Reports retrieved successfully',
                result
            });
        });

    } catch (error) {
        console.error('Error getting reports:', error);
        return res.status(409).json({ message: 'Something went wrong' });
    }
}

const updateReport = (req, res) => {
    const report_id = req.params.id;
    const { status } = req.body;

    try {
        const sql = `
            UPDATE reports SET status = ? WHERE id = ?
            `;

        mysqlcon.query(sql, [status, report_id], (err, result) => {
            if (err) {
                console.error('Error updating report:', err.stack);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.status(200).json({ message: 'Report updated successfully' });
        });
    } catch (err) {
        console.log(err);
        return res.status(409).json({ error: 'Something went wrong' });
    }
}

// API endpoint for deleting user-created content and reported content by admins
const deleteContent = (req, res) => {
    const userId = req.user.id; // User ID of the requester
    const contentType = req.params.type; // Type of content to delete (question, answer, comment, or reply)
    const contentId = req.params.id; // ID of the content to delete
  
    // Check if the requester is an admin
    if (req.user.role !== 'admin') {
      // If not, check if the requester is the creator of the content
      let sql = `SELECT user_id FROM ${contentType}s WHERE id = ?`;
  
      mysqlcon.query(sql, [contentId], (err, results) => {
        if (err) {
          console.error('Error executing SQL query:', err.stack);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
  
        // If the requester is not the creator of the content, return an error
        if (results[0].user_id !== userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
  
        // If the requester is the creator of the content, delete the content
        sql = `DELETE FROM ${contentType}s WHERE id = ?`;
  
        mysqlcon.query(sql, [contentId], (err, results) => {
          if (err) {
            console.error('Error executing SQL query:', err.stack);
            return res.status(500).json({ error: 'Internal Server Error' });
          }
          res.json({ message: 'Content deleted successfully' });
        });
      });
    } else {
      // If the requester is an admin, delete the reported content
      let sql = `DELETE FROM reports WHERE content_type = ? AND content_id = ?`;
  
      mysqlcon.query(sql, [contentType, contentId], (err, results) => {
        if (err) {
          console.error('Error executing SQL query:', err.stack);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
  
        sql = `DELETE FROM ${contentType}s WHERE id = ?`;
  
        mysqlcon.query(sql, [contentId], (err, results) => {
          if (err) {
            console.error('Error executing SQL query:', err.stack);
            return res.status(500).json({ error: 'Internal Server Error' });
          }
          res.json({ message: 'Content deleted successfully' });
        });
      });
    }
  };
  

module.exports = {
    createReport,
    getReports,
    deleteContent
}