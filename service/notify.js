const { mysqlcon } = require("../model/db");

const sendNotificationToInstitution = async (
  institutionId,
  sender_id,
  message
) => {
  // Get the current time
  const currentTime = new Date();

  // Calculate the timestamp for 6 hours ago
  const createdAt = new Date(currentTime.getTime() - 0 * 60 * 60 * 1000);

  // Get the local time zone offset
  const timezoneOffsetInMinutes = currentTime.getTimezoneOffset();

  // Adjust the time for the local time zone offset
  createdAt.setMinutes(createdAt.getMinutes() - timezoneOffsetInMinutes);

  // Format the createdAt timestamp to 'YYYY-MM-DD HH:MM:SS' format
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const query = `
    INSERT INTO notifications (receiver_id,sender_id, message, is_read, createdAt)
    VALUES (?, ?, ?, 0, ?)
  `;
  const values = [institutionId, sender_id, message, formattedCreatedAt];
  console.log(values)
  try {
    await mysqlcon.promise().query(query, values);
  } catch (error) {
    console.error("Error sending notification:", error);
    throw new Error("Failed to send notification");
  }
};

// Service function to handle notifications
const NotificationService = {
    // Function to create a new notification
    createNotification: async (
      sender_role, // 'student', 'teacher', 'professional', or 'institute'
      receiver_role, // 'student', 'teacher', 'professional', or 'institute'
      senderId, 
      receiverId, 
      notificationType, 
      contentId,
      message
    ) => {
      try {
        let query = '';
        let values = [];
    
        // Construct query based on sender and receiver roles
        if (sender_role === 'student' || sender_role === 'teacher' || sender_role === 'professional') {
          if (receiver_role === 'student' || receiver_role === 'teacher' || receiver_role === 'professional') {
            query = `
              INSERT INTO notifications 
              (sender_user_id, receiver_user_id, notification_type, content_id, message)
              VALUES (?, ?, ?, ?, ?)
            `;
            values = [senderId, receiverId, notificationType, contentId, message];
          } else if (receiver_role === 'institute') {
            query = `
              INSERT INTO notifications 
              (sender_user_id, receiver_institute_id, notification_type, content_id, message)
              VALUES (?, ?, ?, ?, ?)
            `;
            values = [senderId, receiverId, notificationType, contentId, message];
          }
        } else if (sender_role === 'institute') {
          if (receiver_role === 'student' || receiver_role === 'teacher' || receiver_role === 'professional') {
            query = `
              INSERT INTO notifications 
              (sender_institute_id, receiver_user_id, notification_type, content_id, message)
              VALUES (?, ?, ?, ?, ?)
            `;
            values = [senderId, receiverId, notificationType, contentId, message];
          } else if (receiver_role === 'institute') {
            query = `
              INSERT INTO notifications 
              (sender_institute_id, receiver_institute_id, notification_type, content_id, message)
              VALUES (?, ?, ?, ?, ?)
            `;
            values = [senderId, receiverId, notificationType, contentId, message];
          }
        }
    
        // Debug: log the query and values
        console.log("Query: ", query);
        console.log("Values: ", values);
    
        // Execute the query
        const [result] = await mysqlcon.promise().query(query, values);
        console.log("Result: ", result);
    
        if (result.affectedRows > 0) {
          return result.insertId; // Return the ID of the newly created notification
        }
        return null;
      } catch (error) {
        console.error('Error creating notification:', error.message);
        throw error;
      }
    }
    
    ,
    
    // Function to mark a notification as read
    markNotificationAsRead: async (notificationId) => {
      try {
        const query = `
          UPDATE notifications
          SET is_read = 1
          WHERE id = ?
        `;
        const values = [notificationId];
  
        const [result] = await mysqlcon.promise().query(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },
  
    // Function to retrieve all notifications for a user
    getNotificationsByUser: async (userId) => {
      try {
        const query = `
          SELECT *
          FROM notifications
          WHERE receiver_id = ?
          ORDER BY createdAt DESC
        `;
        const values = [userId];
  
        const [notifications] = await mysqlcon.promise().query(query, values);
      return notifications;
    } catch (error) {
      console.error("Error retrieving notifications:", error);
      throw error;
    }
  },

  
};
  
  module.exports = NotificationService;
  module.exports={
    sendNotificationToInstitution,
    ...NotificationService,
  }
  