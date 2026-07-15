// controllers/feedbackController.js
const { mysqlcon, sequelize } = require("../model/db");

// Create a new feedback
const createFeedback = async (req, res) => {
  const { user_id, rating, category, feedback } = req.body;

  // Validate required fields
  if (!user_id || !rating || !category || !feedback) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate rating range
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  // Validate category
  const validCategories = [
    'General Feedback',
    'Bug Report', 
    'Feature Request',
    'User Experience',
    'Performance',
    'Other'
  ];

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid category selected" });
  }

  // Validate feedback length
  if (feedback.trim().length < 10) {
    return res.status(400).json({ error: "Feedback must be at least 10 characters long" });
  }

  try {
    // ✅ Check if user exists and is active
    const [existingUser] = await mysqlcon
      .promise()
      .query("SELECT * FROM users WHERE id = ? AND status = 'active'", [user_id]);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: "User not found or inactive" });
    }

    // Insert feedback into database
    const [result] = await mysqlcon.promise().query(
      `INSERT INTO feedback (user_id, rating, category, feedback, status, isRead, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        user_id,
        rating,
        category,
        feedback.trim(),
        'pending',
        false
      ]
    );

    const feedbackId = result.insertId;

    // Optional: Log for analytics or send notification to admins
    console.log(`New feedback received from user_id ${user_id} - Rating: ${rating}/5 - Category: ${category}`);

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully. Thank you for your input!",
      feedbackId
    });

  } catch (error) {
    console.error("Error creating feedback:", error);
    return res.status(500).json({ 
      error: "Internal server error. Please try again later." 
    });
  }
};

// Get all feedback (Admin only)
const getAllFeedback = async (req, res) => {
  const { page = 1, limit = 10, category, status, rating, user_id } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Build WHERE clause based on filters
    let whereClause = "WHERE 1=1";
    const queryParams = [];

    if (category) {
      whereClause += " AND f.category = ?";
      queryParams.push(category);
    }

    if (status) {
      whereClause += " AND f.status = ?";
      queryParams.push(status);
    }

    if (rating) {
      whereClause += " AND f.rating = ?";
      queryParams.push(parseInt(rating));
    }

    if (user_id) {
      whereClause += " AND f.user_id = ?";
      queryParams.push(parseInt(user_id));
    }

    // Get total count
    const [countResult] = await mysqlcon
      .promise()
      .query(`SELECT COUNT(*) as total FROM feedback f ${whereClause}`, queryParams);

    const totalFeedback = countResult[0].total;

    // Get feedback with pagination and user details
    const [feedbackList] = await mysqlcon
      .promise()
      .query(
        `SELECT f.*, u.name, u.email 
         FROM feedback f
         LEFT JOIN users u ON f.user_id = u.id
         ${whereClause} 
         ORDER BY f.createdAt DESC 
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), parseInt(offset)]
      );

    return res.json({
      success: true,
      message: "Feedback retrieved successfully",
      data: {
        feedback: feedbackList,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFeedback / limit),
          totalItems: totalFeedback,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching feedback:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};

// Get feedback by ID
const getFeedbackById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Valid feedback ID is required" });
  }

  try {
    const [feedback] = await mysqlcon
      .promise()
      .query(
        `SELECT f.*, u.name, u.email 
         FROM feedback f
         LEFT JOIN users u ON f.user_id = u.id
         WHERE f.id = ?`, 
        [id]
      );

    if (feedback.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    return res.json({
      success: true,
      message: "Feedback retrieved successfully",
      data: feedback[0]
    });

  } catch (error) {
    console.error("Error fetching feedback:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};

// Update feedback status (Admin only)
const updateFeedbackStatus = async (req, res) => {
  const { id } = req.params;
  const { status, isRead } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Valid feedback ID is required" });
  }

  // Validate status if provided
  const validStatuses = ['pending', 'reviewed', 'resolved'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be: pending, reviewed, or resolved" });
  }

  try {
    // Check if feedback exists
    const [existingFeedback] = await mysqlcon
      .promise()
      .query("SELECT * FROM feedback WHERE id = ?", [id]);

    if (existingFeedback.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    // Build update query
    let updateFields = [];
    let updateValues = [];

    if (status) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    if (typeof isRead === 'boolean') {
      updateFields.push("isRead = ?");
      updateValues.push(isRead);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    updateFields.push("updatedAt = NOW()");
    updateValues.push(id);

    // Update feedback
    await mysqlcon
      .promise()
      .query(
        `UPDATE feedback SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );

    // Get updated feedback with user details
    const [updatedFeedback] = await mysqlcon
      .promise()
      .query(
        `SELECT f.*, u.name, u.email 
         FROM feedback f
         LEFT JOIN users u ON f.user_id = u.id
         WHERE f.id = ?`, 
        [id]
      );

    return res.json({
      success: true,
      message: "Feedback updated successfully",
      data: updatedFeedback[0]
    });

  } catch (error) {
    console.error("Error updating feedback:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};

// Delete feedback (Admin only)
const deleteFeedback = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Valid feedback ID is required" });
  }

  try {
    // Check if feedback exists
    const [existingFeedback] = await mysqlcon
      .promise()
      .query("SELECT * FROM feedback WHERE id = ?", [id]);

    if (existingFeedback.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    // Delete feedback
    await mysqlcon
      .promise()
      .query("DELETE FROM feedback WHERE id = ?", [id]);

    return res.json({
      success: true,
      message: "Feedback deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting feedback:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};

// Get feedback statistics (Admin Dashboard)
const getFeedbackStats = async (req, res) => {
  try {
    // Get total counts
    const [totalCount] = await mysqlcon
      .promise()
      .query("SELECT COUNT(*) as total FROM feedback");

    const [pendingCount] = await mysqlcon
      .promise()
      .query("SELECT COUNT(*) as pending FROM feedback WHERE status = 'pending'");

    const [resolvedCount] = await mysqlcon
      .promise()
      .query("SELECT COUNT(*) as resolved FROM feedback WHERE status = 'resolved'");

    const [unreadCount] = await mysqlcon
      .promise()
      .query("SELECT COUNT(*) as unread FROM feedback WHERE isRead = false");

    // Get rating distribution
    const [ratingStats] = await mysqlcon
      .promise()
      .query(`
        SELECT rating, COUNT(*) as count 
        FROM feedback 
        GROUP BY rating 
        ORDER BY rating
      `);

    // Get category distribution
    const [categoryStats] = await mysqlcon
      .promise()
      .query(`
        SELECT category, COUNT(*) as count 
        FROM feedback 
        GROUP BY category 
        ORDER BY count DESC
      `);

    // Get recent feedback (last 7 days)
    const [recentCount] = await mysqlcon
      .promise()
      .query(`
        SELECT COUNT(*) as recent 
        FROM feedback 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

    // Get top feedback users
    const [topUsers] = await mysqlcon
      .promise()
      .query(`
        SELECT u.id, u.name, u.email, COUNT(f.id) as feedback_count
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        GROUP BY f.user_id
        ORDER BY feedback_count DESC
        LIMIT 5
      `);

    return res.json({
      success: true,
      message: "Feedback statistics retrieved successfully",
      data: {
        total: totalCount[0].total,
        pending: pendingCount[0].pending,
        resolved: resolvedCount[0].resolved,
        unread: unreadCount[0].unread,
        recentWeek: recentCount[0].recent,
        ratingDistribution: ratingStats,
        categoryDistribution: categoryStats,
        topUsers: topUsers
      }
    });

  } catch (error) {
    console.error("Error fetching feedback stats:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};

// Get feedback by user_id (for user to see their own feedback)
const getFeedbackByUserId = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({ error: "Valid user ID is required" });
  }

  try {
    const [userFeedback] = await mysqlcon
      .promise()
      .query(`
        SELECT f.*, u.name, u.email 
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.user_id = ? 
        ORDER BY f.createdAt DESC
      `, [user_id]);

    return res.json({
      success: true,
      message: "User feedback retrieved successfully",
      data: userFeedback
    });

  } catch (error) {
    console.error("Error fetching user feedback:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};

module.exports = {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  getFeedbackStats,
  getFeedbackByUserId
};