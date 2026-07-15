//  const { DBMODELS } = require("./models/init-models");
//  const locationsData = require("./location.json")



// // ✅ Initialize model

// async function insertLocations() {
//   try {
//     // Insert each record
//     for (const loc of locationsData) {
//       await DBMODELS.locations.create({
//         user_id: loc.id,
//         city_name: loc.city,
//         state_name: loc.state,
//         area: loc.nearestLocation, // optional: store country in "area" or add a new column
//       });
//     }

//     console.log("✅ Locations inserted successfully!");
//   } catch (error) {
//     console.error("❌ Error inserting locations:", error);
//   }
// }

// // Run the function
// insertLocations();




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

// NEW FUNCTION: Send notification to all registered users
const sendNotificationToAllUsers = async ({
  sender_id,
  sender_name,
  sender_role,
  notification_type,
  content_id,
  message = "New notification for all users",
  exclude_user_ids = [] // Users to exclude from notification (e.g., sender)
}) => {
  try {
    console.log(`🔔 Sending notification to all users: ${message}`);
    
    // Get all active users from database
    const getUsersSql = `
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE is_active = 1 
      ${exclude_user_ids.length ? `AND id NOT IN (${exclude_user_ids.join(',')})` : ''}
      ORDER BY id DESC
    `;
    
    const [allUsers] = await mysqlcon.promise().query(getUsersSql);
    
    console.log(`📤 Notifying ${allUsers.length} users`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Create notifications for each user
    for (const user of allUsers) {
      try {
        // Determine query based on sender role and receiver role
        let query = '';
        let values = [];
        
        if (sender_role === 'student' || sender_role === 'teacher' || sender_role === 'professional') {
          query = `
            INSERT INTO notifications 
            (sender_user_id, receiver_user_id, notification_type, content_id, message)
            VALUES (?, ?, ?, ?, ?)
          `;
          values = [sender_id, user.id, notification_type, content_id, message];
        } else if (sender_role === 'institute') {
          query = `
            INSERT INTO notifications 
            (sender_institute_id, receiver_user_id, notification_type, content_id, message)
            VALUES (?, ?, ?, ?, ?)
          `;
          values = [sender_id, user.id, notification_type, content_id, message];
        }
        
        if (query) {
          await mysqlcon.promise().query(query, values);
          successCount++;
        }
      } catch (userError) {
        console.error(`❌ Error notifying user ${user.id}:`, userError.message);
        errorCount++;
        // Continue with other users
      }
    }
    
    console.log(`✅ Notifications sent: ${successCount} successful, ${errorCount} failed`);
    
    return {
      success: true,
      total_users: allUsers.length,
      notified_count: successCount,
      error_count: errorCount,
      message: `Notification sent to ${successCount} users`
    };
    
  } catch (error) {
    console.error("❌ Error in sendNotificationToAllUsers:", error);
    return {
      success: false,
      error: error.message
    };
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
        console.log("Result For Notification : ", result);
    
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
module.exports = {
  sendNotificationToInstitution,
  ...NotificationService,
  sendNotificationToAllUsers, // Export the new function
};

// ===================== socket.js =====================

const {
  createNotification,
  sendNotificationToInstitution,
  sendNotificationToAllUsers, // Import the new function
} = require("./service/notify");
const {
  appendMessageToRoomFile,
  getRoomChatData,
} = require("./utils/chatStore");
const { logg } = require("./utils/utils");
const Users = require("./models/users");
const { saveMsg } = require("./controllers/messages.controller");
const { mysqlcon } = require("./model/db");

const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

let onlineUsers = [];

/**
 * Add or update a user in memory
 */
const addNewUser = async (userData, socketId) => {
  if (!userData?.id) return;

  console.log("📝 Adding user:", userData.email, "with socket:", socketId);

  const existingUserIndex = onlineUsers.findIndex((u) => u.userData.id === userData.id);

  if (existingUserIndex !== -1) {
    // Update existing user
    onlineUsers[existingUserIndex].userData.socketId = socketId;
    onlineUsers[existingUserIndex].userData.is_online = true;
    console.log("✅ Updated existing user:", userData.email);
  } else {
    // Add new user
    onlineUsers.push({
      userData: {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        profile: userData.profile,
        is_online: true,
        socketId,
      },
    });
    console.log("🆕 Added new user:", userData.email);
  }

  console.log("👥 Total online users:", onlineUsers.length);

  try {
    await mysqlcon
      .promise()
      .query("UPDATE users SET is_online = 'true' WHERE id = ?", [userData.id]);
    console.log("📊 Database updated - user marked online");
  } catch (err) {
    console.error("❌ DB error setting user online:", err);
  }

  // Return the current online users list
  return onlineUsers;
};

/**
 * Get user by ID
 */
const getUser = (userId) => onlineUsers.find((u) => u.userData.id === userId);

/**
 * Get user by socket ID
 */
const getUserBySocket = (socketId) =>
  onlineUsers.find((u) => u.userData.socketId === socketId);

/**
 * Remove user from online list
 */
const removeUser = async ({ socketId = null, userId = null }) => {
  let removedUser = null;
  let userIdToUpdate = null;

  if (userId) {
    const index = onlineUsers.findIndex((u) => u.userData.id === userId);
    if (index !== -1) {
      removedUser = onlineUsers.splice(index, 1)[0];
      userIdToUpdate = userId;
    }
  } else if (socketId) {
    const index = onlineUsers.findIndex((u) => u.userData.socketId === socketId);
    if (index !== -1) {
      removedUser = onlineUsers.splice(index, 1)[0];
      userIdToUpdate = removedUser.userData.id;
    }
  }

  if (userIdToUpdate) {
    try {
      await mysqlcon
        .promise()
        .query("UPDATE users SET is_online = 'false' WHERE id = ?", [userIdToUpdate]);

      console.log(`👋 User removed: ${removedUser?.userData?.email || 'Unknown'} (ID: ${userIdToUpdate})`);
      console.log("👥 Remaining online users:", onlineUsers.length);
    } catch (err) {
      console.error("❌ DB error setting user offline:", err);
    }
  }

  return onlineUsers;
};

/**
 * Initialize Socket.IO
 */
const InitSocket = () => {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // ADD_USER - Enhanced with immediate broadcast
    socket.on("ADD_USER", async (userData) => {
      try {
        const updatedUsers = await addNewUser(userData, socket.id);
        
        // Broadcast to ALL clients (including the sender)
        io.emit("USER_ADDED", updatedUsers);
        
        // Send a specific confirmation to the user who just logged in
        socket.emit("LOGIN_SUCCESS", {
          message: "You are now online",
          userData: userData,
          onlineCount: updatedUsers?.length
        });
        
        console.log("📡 Broadcasted user list to all clients");
      } catch (error) {
        console.error("❌ Error adding user:", error);
        socket.emit("LOGIN_ERROR", { message: "Failed to mark user as online" });
      }
    });

    // SEND_MSG
    socket.on("SEND_MSG", async (msg) => {
      try {
        const result = await saveMsg(msg);
        io.emit("MESSAGE_SAVED", result);
      } catch (err) {
        socket.emit("SAVE_MSG_ERROR", "Failed to save message");
        return;
      }

      const receiver = getUser(msg.receiver);
      if (receiver && receiver.userData.socketId) {
        io.to(receiver.userData.socketId).emit("RECIVED_MSG", msg);
      }
    });

    // NEW: Send notification to all users (Broadcast)
    socket.on("send-notification-to-all", async ({
      sender_id,
      sender_name,
      sender_role,
      type,
      content_id,
      message = "New announcement for all users",
      exclude_user_ids = [] // Optional: exclude certain users
    }) => {
      console.log("📢 Broadcasting notification to all users:", {
        sender_id,
        sender_name,
        sender_role,
        type,
        content_id,
        message,
        exclude_user_ids
      });
      
      try {
        // Save notifications to database for all users
        const result = await sendNotificationToAllUsers({
          sender_id,
          sender_name,
          sender_role,
          notification_type: type,
          content_id,
          message,
          exclude_user_ids
        });
        
        console.log("Broadcast notification result:", result);
        
        if (result.success) {
          // Create notification data for real-time broadcast
          const broadcastNotification = {
            id: `broadcast-${Date.now()}`,
            sender_id,
            sender_name,
            sender_role,
            type,
            content_id,
            message,
            is_broadcast: true,
            receiver_id: 'all',
            createdAt: new Date().toISOString(),
            total_recipients: result.notified_count
          };
          
          // Emit to ALL connected clients in real-time
          io.emit("notification-to-all", broadcastNotification);
          
          // Also emit as a regular notification for compatibility
          io.emit("get-notification", {
            ...broadcastNotification,
            is_read: 0,
            notification_type: type
          });
          
          console.log(`✅ Broadcast sent to ${result.notified_count} users`);
        }
      } catch (error) {
        console.error("❌ Error broadcasting notification:", error);
      }
    });

    // Notifications - Original send-notification (to specific user)
    socket.on("send-notification", async ({
      sender_role,
      receiver_role,
      sender_name,
      sender_id,
      receiver_id,
      type,
      content_id,
      message = "You got a new notification",
    }) => {
      console.log("📩 Incoming Notification Payload:", {
        sender_role,
        receiver_role,
        sender_name,
        sender_id,
        receiver_id,
        type,
        content_id,
        message,
      });
      
      // Create notification and get the data
      const notification = await createNotification(
        sender_role, 
        receiver_role, 
        sender_id, 
        receiver_id, 
        type, 
        content_id, 
        message
      );

      if (notification) {
        // Prepare notification data for frontend
        const notificationData = {
          ...notification,
          sender_name,
          type: type || notification.notification_type,
          notification_type: type || notification.notification_type
        };

        // Emit to the specific receiver if they're online
        const receiver = getUser(receiver_id);
        if (receiver && receiver.userData.socketId) {
          io.to(receiver.userData.socketId).emit("get-notification", notificationData);
        }
        
        // Also emit a general notification event
        io.emit("new-notification", {
          receiver_id,
          notification: notificationData
        });
      }
    });

    // NEW: Send notification to multiple users at once
    socket.on("send-notification-to-multiple", async ({
      sender_role,
      sender_name,
      sender_id,
      receiver_ids = [], // Array of user IDs
      type,
      content_id,
      message = "You got a new notification",
    }) => {
      console.log("📨 Sending notification to multiple users:", {
        sender_role,
        sender_name,
        sender_id,
        receiver_ids_count: receiver_ids.length,
        type,
        content_id,
        message,
      });
      
      try {
        let successCount = 0;
        
        // Send to each receiver
        for (const receiver_id of receiver_ids) {
          try {
            const notification = await createNotification(
              sender_role,
              'user', // Assuming all receivers are users
              sender_id,
              receiver_id,
              type,
              content_id,
              message
            );
            
            if (notification) {
              const notificationData = {
                ...notification,
                sender_name,
                type,
                notification_type: type
              };
              
              // Send to the specific receiver if online
              const receiver = getUser(receiver_id);
              if (receiver && receiver.userData.socketId) {
                io.to(receiver.userData.socketId).emit("get-notification", notificationData);
              }
              
              successCount++;
            }
          } catch (userError) {
            console.error(`❌ Error notifying user ${receiver_id}:`, userError.message);
          }
        }
        
        console.log(`✅ Sent notifications to ${successCount}/${receiver_ids.length} users`);
        
        // Also emit a general event for bulk notifications
        io.emit("bulk-notifications-sent", {
          sender_id,
          sender_name,
          type,
          content_id,
          total_sent: successCount,
          total_attempted: receiver_ids.length
        });
        
      } catch (error) {
        console.error("❌ Error sending multiple notifications:", error);
      }
    });

    // Class / Room events
    socket.on("start-class", (data) => socket.join(data.room));
    socket.on("join-room", (data) => {
      logg.info("User joined", data);
      socket.join(data.room);
      socket.emit("user-joined", data);
    });
    socket.on("send-message", (data) => {
      const receiver = getUser(data?.to);
      if (receiver) {
        socket.to(receiver.userData.socketId).emit("receive-message", data);
      }
      appendMessageToRoomFile(data?.room, data);
    });
    socket.on("user-disconnected", (data) => {
      socket.broadcast.to(data.room).emit("user-left", { user: data.user, userId: data.id });
    });

    // USER_REMOVED (manual logout)
    socket.on("USER_REMOVED", async (data) => {
      try {
        const updatedUsers = await removeUser({ userId: data.id });
        io.emit("USER_ADDED", updatedUsers);
        console.log("👋 User manually logged out:", data.id);
      } catch (error) {
        console.error("❌ Error removing user:", error);
      }
    });

    // DISCONNECT - Only remove user when socket actually disconnects
    socket.on("disconnect", async () => {
      console.log("🔌 Socket disconnected:", socket.id);

      const user = getUserBySocket(socket.id);
      if (user) {
        try {
          const updatedUsers = await removeUser({ socketId: socket.id });
          io.emit("USER_ADDED", updatedUsers);
          console.log("👋 User disconnected and removed:", user.userData.email);
        } catch (error) {
          console.error("❌ Error handling disconnect:", error);
        }
      }
    });

    // Get current online users (useful for when components mount)
    socket.on("GET_ONLINE_USERS", () => {
      socket.emit("USER_ADDED", onlineUsers);
    });
  });

  console.log("🚀 Socket.IO initialized and ready");
};

module.exports = { app, http, InitSocket };