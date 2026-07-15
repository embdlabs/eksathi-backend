const { mysqlcon } = require("../model/db");

const getNotifications = (req, res) => {
  const userId = req?.user?.id;
  const { role } = req.query;

  // Determine the correct receiver column based on the user's role
  const receiverColumn =
    role === "student" || role === "teacher" || role === "professional"
      ? "n.receiver_user_id"
      : "n.receiver_institute_id";

  try {
    // Main query with table alias 'n'
    const query = `
        SELECT n.*, u.avatar_url, u.first_name, u.last_name, q.slug, i.name as institute_name
        FROM notifications n
        LEFT JOIN users u 
          ON n.sender_user_id = u.id
        LEFT JOIN institutes i
          ON n.sender_institute_id = i.id
        LEFT JOIN questions q 
          ON n.content_id = q.id
        WHERE ${receiverColumn} = ?
        ORDER BY n.createdAt DESC;
      `;
    const values = [userId];

    // Fetch the notifications
    mysqlcon.query(query, values, (err, notifications) => {
      if (err) {
        console.log(err);
        return res?.status(500).json({ message: "Internal Server Error" });
      }

      // Determine the receiver column without alias for the COUNT query
      const simpleReceiverColumn =
        role === "student" || role === "teacher" || role === "professional"
          ? "receiver_user_id"
          : "receiver_institute_id";

      // Query for unread notifications without the alias
      mysqlcon.query(
        `SELECT COUNT(*) AS count
           FROM notifications
           WHERE ${simpleReceiverColumn} = ? AND is_read = 0`,
        values,
        (err, unread) => {
          if (err) {
            console.log(err);
            return res?.status(500).json({ message: "Internal Server Error" });
          }

          return res
            ?.status(200)
            .json({ notifications, unread: unread[0]?.count, message: "OK" });
        }
      );
    });
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return res?.status(500).json({ message: "Internal Server Error" });
  }
};

// const getNotifications = (req, res) => {
//   const userId = req?.user?.id;
//   const role = (req.query.role || "").toLowerCase(); // normalize role

//   // Decide which column to check (receiver side)
//   const receiverColumn =
//     role === "student" || role === "teacher" || role === "professional"
//       ? "n.receiver_user_id"
//       : "n.receiver_institute_id";

//   try {
//     // Base query
//     let query = `

//       SELECT n.*, q.slug
//       FROM notifications n
//       LEFT JOIN questions q ON n.content_id = q.id
//     `;

//     if (role === "student" || role === "teacher" || role === "professional") {
//       query += ` LEFT JOIN users u ON n.sender_user_id = u.id `;
//     } else {
//       query += ` LEFT JOIN institutes i ON n.sender_institute_id = i.id `;
//     }

//     query += `
//       WHERE ${receiverColumn} = ?
//       ORDER BY n.createdAt DESC
//     `;

//     const values = [userId];

//     // 🔍 Debug logs
//     console.log("====== DEBUG NOTIFICATIONS ======");
//     console.log("Role from query:", role);
//     console.log("Receiver Column used:", receiverColumn);
//     console.log("Logged-in userId:", userId);
//     console.log("Final SQL Query:\n", query);
//     console.log("SQL Values:", values);
//     console.log("=================================");

//     // Execute notifications query
//     mysqlcon.query(query, values, (err, notifications) => {
//       if (err) {
//         console.error("❌ Error fetching notifications:", err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }

//       console.log("✅ Notifications fetched:", notifications.length);
//       if (notifications.length > 0) {
//         console.log("First notification row:", notifications[0]);
//       }

//       // Count unread notifications
//       const simpleReceiverColumn =
//         role === "student" || role === "teacher" || role === "professional"
//           ? "receiver_user_id"
//           : "receiver_institute_id";

//       const unreadQuery = `
//         SELECT COUNT(*) AS count
//         FROM notifications
//         WHERE ${simpleReceiverColumn} = ? AND is_read = 0
//       `;

//       console.log("Unread SQL Query:\n", unreadQuery);
//       console.log("Unread SQL Values:", values);

//       mysqlcon.query(unreadQuery, values, (err, unread) => {
//         if (err) {
//           console.error("❌ Error fetching unread count:", err);
//           return res.status(500).json({ message: "Internal Server Error" });
//         }

//         console.log("✅ Unread count:", unread[0]?.count || 0);

//         return res.status(200).json({
//           notifications,
//           unread: unread[0]?.count || 0,
//           message: "OK",
//         });
//       });
//     });
//   } catch (error) {
//     console.error("❌ Error retrieving notifications:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const markRead = (req, res) => {
//   const { notificationId } = req.body;
//   try {
//     const query = `
//         UPDATE notifications
//         SET is_read = 1
//         WHERE id = ?
//       `;
//     const values = [notificationId];

//     mysqlcon.query(query, values, (err, result) => {
//       if (err) {
//         console.log(err);
//         return res?.status(500).json({ message: "Internal Server Error" });
//       }
//       return res.status(200).json({
//         message: "Notification marked as read",
//         success: result.affectedRows > 0,
//       });
//     });
//   } catch (error) {
//     console.error("Error retrieving notifications:", error);
//     return res?.status(500).json({ message: "Internal Server Error" });
//   }
// };


// In your notification controller, update markRead function
const markRead = (req, res) => {
  const { notificationId, userId, role } = req.body; // Add userId and role to request
  try {
    // First, update the notification as read
    const updateQuery = `
        UPDATE notifications
        SET is_read = 1
        WHERE id = ?
      `;
    const updateValues = [notificationId];

    mysqlcon.query(updateQuery, updateValues, (err, result) => {
      if (err) {
        console.log(err);
        return res?.status(500).json({ message: "Internal Server Error" });
      }

      // Then get the new unread count
      const receiverColumn =
        role === "student" || role === "teacher" || role === "professional"
          ? "receiver_user_id"
          : "receiver_institute_id";

      const countQuery = `
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE ${receiverColumn} = ? AND is_read = 0
      `;

      mysqlcon.query(countQuery, [userId], (countErr, unreadResult) => {
        if (countErr) {
          console.log(countErr);
          return res?.status(500).json({ message: "Internal Server Error" });
        }

        return res.status(200).json({
          message: "Notification marked as read",
          success: result.affectedRows > 0,
          newUnreadCount: unreadResult[0]?.count || 0
        });
      });
    });
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return res?.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllNotification = async (req, res) => {
  const { userId } = req.params;
  const { type } = req.query;

  // console.log("UserId : ------------------------ ,", userId);
  // console.log("Type : ------------------------ ,", type);

  try {
    // Build the base query
    let query = `SELECT * FROM notifications WHERE receiver_institute_id = ?`;
    const queryParams = [userId];

    // Add type filter if provided
    if (type) {
      query += ` AND notification_type = ?`;
      queryParams.push(type);
    }

    // Execute the query
    const [rows] = await mysqlcon.promise().query(query, queryParams);

    // Return notifications to the frontend
    res.status(200).json({
      message: "Notifications fetched successfully.",
      notifications: rows,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      message: "Internal server error. Please try again later.",
    });
  }
};

// In your notification controller
// const markAllAsRead = (req, res) => {
//   const { userId, role } = req.body;
  
//   try {
//     const receiverColumn =
//       role === "student" || role === "teacher" || role === "professional"
//         ? "receiver_user_id"
//         : "receiver_institute_id";

//     // First, mark all as read
//     const updateQuery = `
//       UPDATE notifications
//       SET is_read = 1
//       WHERE ${receiverColumn} = ? AND is_read = 0
//     `;

//     mysqlcon.query(updateQuery, [userId], (err, result) => {
//       if (err) {
//         console.log(err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }

//       return res.status(200).json({
//         message: "All notifications marked as read",
//         success: result.affectedRows > 0,
//         markedCount: result.affectedRows
//       });
//     });
//   } catch (error) {
//     console.error("Error marking all notifications as read:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const markAllAsRead = (req, res) => {
  const { userId, role } = req.body;
  // console.log("Body is ",req.body)
  // console.log("UserID is ",userId)
  // console.log("roleis ",role)
  if (!userId || !role) {
    return res.status(400).json({ 
      message: "User ID and role are required",
      success: false 
    });
  }
  
  try {
    const receiverColumn =
      role === "student" || role === "teacher" || role === "professional"
        ? "receiver_user_id"
        : "receiver_institute_id";

    // Mark all as read
    const updateQuery = `
      UPDATE notifications
      SET is_read = 1
      WHERE ${receiverColumn} = ? AND is_read = 0
    `;

    mysqlcon.query(updateQuery, [userId], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ 
          message: "Internal Server Error",
          success: false 
        });
      }

      // Get the new unread count after update
      const countQuery = `
        SELECT COUNT(*) AS unreadCount 
        FROM notifications 
        WHERE ${receiverColumn} = ? AND is_read = 0
      `;

      mysqlcon.query(countQuery, [userId], (countErr, countResult) => {
        if (countErr) {
          console.log(countErr);
          return res.status(500).json({ 
            message: "Internal Server Error",
            success: false 
          });
        }

        return res.status(200).json({
          message: result.affectedRows > 0 
            ? "All notifications marked as read" 
            : "No unread notifications to mark",
          success: true, // Always return true for successful operation
          markedCount: result.affectedRows || 0,
          unreadCount: countResult[0]?.unreadCount || 0
        });
      });
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ 
      message: "Internal Server Error",
      success: false 
    });
  }
};


// Add this to your notification controller
const getNotificationContent = async (req, res) => {
  const { contentId, notificationType } = req.params;
  
  try {
    let query = '';
    let values = [contentId];
    
    // Based on notification type, fetch from different tables
    switch(parseInt(notificationType)) {
      case 1: // Question
        query = 'SELECT * FROM questions WHERE id = ?';
        break;
      case 2: // Comment
        query = 'SELECT * FROM comments WHERE id = ?';
        break;
      case 3: // Answer
        query = 'SELECT * FROM answers WHERE id = ?';
        break;
      case 4: // Content
        query = 'SELECT * FROM contents WHERE id = ?';
        break;
      default:
        return res.status(400).json({
          message: 'Invalid notification type',
          success: false
        });
    }
    
    const [rows] = await mysqlcon.promise().query(query, values);
    
    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Content not found',
        success: false
      });
    }
    
    return res.status(200).json({
      message: 'Content fetched successfully',
      success: true,
      content: rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching notification content:', error);
    return res.status(500).json({
      message: 'Internal server error',
      success: false
    });
  }
};

// Add to router


module.exports = {
  getNotifications,
  markRead,
  getAllNotification,
  markAllAsRead,
  getNotificationContent
};
