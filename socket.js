const {
  createNotification,
  sendNotificationToInstitution,
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
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

let onlineUsers = [];

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

const addNewUser = (userData, socketId) => {
  if (!userData || !userData.id) {
    console.error("❌ User data is missing or invalid", userData);
    return;
  }

  console.log("📝 Adding/updating user:", {
    userId: userData.id,
    email: userData.email,
    socketId: socketId,
    existingUsers: onlineUsers.length,
  });

  const existingUserIndex = onlineUsers.findIndex(
    (user) => user.userData.id === userData.id
  );

  const userPayload = {
    ...userData,
    socketId,
    is_online: true,
    last_seen: new Date().toISOString(),
  };

  if (existingUserIndex !== -1) {
    const connectedAt = onlineUsers[existingUserIndex].userData.connected_at;
    onlineUsers[existingUserIndex].userData = {
      ...onlineUsers[existingUserIndex].userData,
      ...userPayload,
      connected_at: connectedAt,
    };
    console.log(`🔄 Updated existing user: ${userData.email} (ID: ${userData.id})`);
  } else {
    onlineUsers.push({
      userData: {
        ...userPayload,
        connected_at: new Date().toISOString(),
      },
    });
    console.log(`🆕 Added new user: ${userData.email} (ID: ${userData.id})`);
  }

  if (mysqlcon) {
    try {
      const query = `UPDATE users SET is_online = 'true', updatedAt = NOW() WHERE id = ?`;
      mysqlcon.query(query, [userData.id], (err, result) => {
        if (err) {
          console.error(`❌ Database error updating online status for user ${userData.id}:`, err);
        } else {
          if (result.affectedRows > 0) {
            console.log(`✅ Database updated: is_online = 'true' for user ${userData.id} (${userData.email})`);
          } else {
            console.warn(`⚠️ No rows affected - user ${userData.id} might not exist in database`);
          }
        }
      });
    } catch (error) {
      console.log("Error while registering user", error);
    }
  }

  console.log(`👥 Total online users: ${onlineUsers.length}`);
  console.log("📊 Current online users:", onlineUsers.map((u) => ({
    id: u.userData.id,
    email: u.userData.email,
    socketId: u.userData.socketId,
    last_seen: u.userData.last_seen,
  })));

  return onlineUsers[existingUserIndex !== -1 ? existingUserIndex : onlineUsers.length - 1];
};

// Remove user by socket ID
const removeUser = (socketId) => {
  const index = onlineUsers.findIndex(
    (user) => user.userData.socketId === socketId
  );

  if (index !== -1) {
    const user = onlineUsers[index];
    const userId = user.userData.id;

    console.log(`👋 Removing user: ${user.userData.email} (Socket: ${socketId})`);

    // Mark as offline instead of removing immediately
    onlineUsers[index].userData.is_online = false;
    onlineUsers[index].userData.last_seen = new Date().toISOString();

    // Remove after 5 seconds to allow for reconnection
    setTimeout(() => {
      const stillExists = onlineUsers.findIndex(
        (u) => u.userData.socketId === socketId
      );
      if (stillExists !== -1 && !onlineUsers[stillExists].userData.is_online) {
        onlineUsers.splice(stillExists, 1);
        console.log(`🗑️ Permanently removed user after timeout: ${user.userData.email}`);
        io.emit("USER_ADDED", onlineUsers);
      }
    }, 5000);

    if (mysqlcon) {
      try {
        const query = `UPDATE users SET is_online = 'false', updatedAt = NOW() WHERE id = ?`;
        mysqlcon.query(query, [userId], (err, result) => {
          if (err) {
            // BUG FIX 4: was userData?.id (undefined in this scope) — use userId instead
            console.error(`❌ Database error updating online status for user ${userId}:`, err);
          }
        });
      } catch (error) {
        console.log("Error while removing user", error);
      }
    }

    console.log(`👥 Remaining online users: ${onlineUsers.length}`);
  } else {
    console.log(`⚠️ User with socket ID ${socketId} not found in online users`);
  }
};

// Get user by ID
const getUser = (userId) => {
  const user = onlineUsers.find((user) => user.userData.id == userId);

  if (user) {
    console.log(`🔍 Found user ${userId}:`, {
      email: user.userData.email,
      socketId: user.userData.socketId,
      is_online: user.userData.is_online,
    });
  } else {
    console.log(`🔍 User ${userId} not found in online users`);
  }

  return user;
};

// ============================================
// CLEANUP STALE CONNECTIONS
// ============================================
const cleanupStaleConnections = () => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes

  const initialCount = onlineUsers.length;

  onlineUsers = onlineUsers.filter((user) => {
    const lastSeen = new Date(user.userData.last_seen).getTime();
    const isStale = now - lastSeen > timeout;

    if (isStale) {
      console.log(`🧹 Removing stale connection: ${user.userData.email} (Last seen: ${user.userData.last_seen})`);
    }

    return !isStale;
  });

  if (initialCount !== onlineUsers.length) {
    console.log(`🧹 Cleanup complete: Removed ${initialCount - onlineUsers.length} stale connections`);
    io.emit("USER_ADDED", onlineUsers);
  }

  setTimeout(cleanupStaleConnections, 60 * 1000);
};

// ============================================
// INITIALIZE SOCKET.IO
// ============================================
const InitSocket = () => {
  console.log("🚀 Initializing Socket.IO server...");

  cleanupStaleConnections();

  io.on("connection", (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    console.log(`📊 Total connections: ${io.engine.clientsCount}`);

    socket.emit("ONLINE_USERS_INIT", onlineUsers);
    console.log(`📤 Sent ${onlineUsers.length} online users to new connection`);

    // ============================================
    // USER REGISTRATION
    // ============================================
    socket.on("ADD_USER", (userData) => {
      console.log(`👤 ADD_USER received from: ${userData.email} (ID: ${userData.id})`);

      if (!userData || !userData.id) {
        console.error("❌ Invalid user data received:", userData);
        socket.emit("CONNECTION_ERROR", {
          error: "Invalid user data",
          message: "User ID is required",
        });
        return;
      }

      const addedUser = addNewUser(userData, socket.id);

      socket.emit("CONNECTION_SUCCESS", {
        message: "Socket connection established and user added",
        socketId: socket.id,
        userId: userData.id,
        timestamp: new Date().toISOString(),
        onlineUsersCount: onlineUsers.length,
        userData: addedUser.userData,
      });

      console.log(`✅ User ${userData.email} successfully registered with socket ${socket.id}`);

      io.emit("USER_ADDED", onlineUsers);
    });

    // ============================================
    // HEARTBEAT HANDLING
    // ============================================
    socket.on("USER_HEARTBEAT", (userId) => {
      const userIndex = onlineUsers.findIndex((user) => user.userData.id == userId);

      if (userIndex !== -1) {
        onlineUsers[userIndex].userData.last_seen = new Date().toISOString();
        onlineUsers[userIndex].userData.is_online = true;
        console.log(`💓 Heartbeat received from user ${userId} (${onlineUsers[userIndex].userData.email})`);
      } else {
        console.log(`⚠️ Heartbeat from unknown user: ${userId}`);
      }
    });

    socket.on("heartbeat", (data) => {
      if (data && data.userId) {
        const userIndex = onlineUsers.findIndex((user) => user.userData.id == data.userId);
        if (userIndex !== -1) {
          onlineUsers[userIndex].userData.last_seen = new Date().toISOString();
          onlineUsers[userIndex].userData.is_online = true;
        }
      }

      socket.emit("heartbeat-response", {
        timestamp: Date.now(),
        onlineUsersCount: onlineUsers.length,
      });
    });

    // ============================================
    // MESSAGE HANDLING
    // ============================================
    socket.on("SEND_MSG", async (msg) => {
      console.log("📨 Message received:", {
        from: msg.sender,
        to: msg.receiver,
        type: msg.type || "text",
      });

      let savedMessage;
      try {
        const result = await saveMsg(msg);
        console.log("✅ Message saved successfully:", result);
        savedMessage = result;
        socket.emit("MESSAGE_SAVED", result);
      } catch (error) {
        console.error("❌ Error saving message:", error);
        socket.emit("SAVE_MSG_ERROR", {
          error: "Failed to save message",
          details: error.message,
        });
        return;
      }

      const messageToSend = {
        ...savedMessage,
        room: savedMessage?.room || savedMessage?.room_id || msg.room,
        room_id: savedMessage?.room_id || savedMessage?.room || msg.room,
        message: savedMessage?.message || msg.message,
        msg: savedMessage?.message || msg.message,
        sender: msg.sender,
        receiver: msg.receiver,
        sender_user_id:
          savedMessage?.sender_user_id ||
          (msg.sender_role !== "institute" ? msg.sender : null),
        sender_institute_id:
          savedMessage?.sender_institute_id ||
          (msg.sender_role === "institute" ? msg.sender : null),
        receiver_user_id:
          savedMessage?.receiver_user_id ||
          (msg.receiver_role !== "institute" ? msg.receiver : null),
        receiver_institute_id:
          savedMessage?.receiver_institute_id ||
          (msg.receiver_role === "institute" ? msg.receiver : null),
        sender_role: msg.sender_role,
        receiver_role: msg.receiver_role,
        time_to_send: savedMessage?.time_to_send || msg.time_to_send,
        createdAt: savedMessage?.createdAt || savedMessage?.time_to_send || msg.createdAt,
      };

      console.log("📤 Prepared message to send:", messageToSend);

      const sender = getUser(msg.sender);
      if (sender && sender.userData.socketId) {
        console.log(`📤 Sending message back to sender ${sender.userData.email} (Socket: ${sender.userData.socketId})`);
        io.to(sender.userData.socketId).emit("RECEIVED_MSG", messageToSend);
      } else {
        console.log(`⚠️ Sender ${msg.sender} not found or offline`);
      }

      const receiver = getUser(msg.receiver);
      if (receiver && receiver.userData.socketId && receiver.userData.is_online) {
        console.log(`📤 Sending message to receiver ${receiver.userData.email} (Socket: ${receiver.userData.socketId})`);
        io.to(receiver.userData.socketId).emit("RECEIVED_MSG", messageToSend);
      } else {
        console.log(`⚠️ Receiver ${msg.receiver} is offline or not found`);
      }
    });

    // ============================================
    // TYPING INDICATOR HANDLING
    // ============================================
    socket.on("TYPING_START", (data) => {
      const { room, userId, userName } = data;
      if (!room || !userId) return;

      const roomStr = String(room);
      const userIdStr = String(userId);
      let receiverId = roomStr;

      if (roomStr.endsWith(userIdStr)) {
        receiverId = roomStr.slice(0, -userIdStr.length);
      } else {
        receiverId = roomStr.replace(new RegExp(userIdStr + "$"), "");
      }

      if (receiverId && receiverId !== roomStr) {
        const receiver = getUser(receiverId);
        if (receiver && receiver.userData.socketId && receiver.userData.is_online) {
          io.to(receiver.userData.socketId).emit("TYPING_START", {
            room: room,
            userId: userId,
            userName: userName || "Someone",
          });
        }
      }
    });

    socket.on("TYPING_STOP", (data) => {
      const { room, userId } = data;
      if (!room || !userId) return;

      const roomStr = String(room);
      const userIdStr = String(userId);
      let receiverId = roomStr;

      if (roomStr.endsWith(userIdStr)) {
        receiverId = roomStr.slice(0, -userIdStr.length);
      } else {
        receiverId = roomStr.replace(new RegExp(userIdStr + "$"), "");
      }

      if (receiverId && receiverId !== roomStr) {
        const receiver = getUser(receiverId);
        if (receiver && receiver.userData.socketId && receiver.userData.is_online) {
          io.to(receiver.userData.socketId).emit("TYPING_STOP", {
            room: room,
            userId: userId,
          });
        }
      }
    });

    // ============================================
    // NOTIFICATION HANDLING
    // ============================================
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
      console.log("📩 Notification request:", {
        from: sender_name,
        to: receiver_id,
        type: type,
      });

      try {
        const notification = await createNotification(
          sender_role,
          receiver_role,
          sender_id,
          receiver_id,
          type,
          content_id,
          message
        );

        console.log("✅ Notification created:", notification?.id || notification);

        let notificationData;

        if (notification && typeof notification === "object") {
          notificationData = {
            id: notification.id,
            message: notification.message || message,
            notification_type: notification.notification_type || type,
            type: type,
            content_id: notification.content_id || content_id,
            sender_id: notification.sender_id || sender_id,
            receiver_id: notification.receiver_id || receiver_id,
            sender_name: sender_name,
            sender_first_name: sender_name ? sender_name.split(" ")[0] : "User",
            sender_last_name: sender_name ? sender_name.split(" ").slice(1).join(" ") : "",
            first_name: sender_name ? sender_name.split(" ")[0] : "User",
            last_name: sender_name ? sender_name.split(" ").slice(1).join(" ") : "",
            is_read: notification.is_read || 0,
            is_broadcast: notification.is_broadcast || false,
            createdAt: notification.createdAt || notification.created_at || new Date().toISOString(),
            created_at: notification.createdAt || notification.created_at || new Date().toISOString(),
            ...notification,
          };
        } else {
          notificationData = {
            id: notification,
            message: message,
            notification_type: type,
            type: type,
            content_id: content_id,
            sender_id: sender_id,
            receiver_id: receiver_id,
            sender_name: sender_name,
            sender_first_name: sender_name ? sender_name.split(" ")[0] : "User",
            sender_last_name: sender_name ? sender_name.split(" ").slice(1).join(" ") : "",
            first_name: sender_name ? sender_name.split(" ")[0] : "User",
            last_name: sender_name ? sender_name.split(" ").slice(1).join(" ") : "",
            is_read: 0,
            is_broadcast: false,
            createdAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
        }

        const receiver = getUser(receiver_id);

        if (receiver && receiver.userData && receiver.userData.socketId && receiver.userData.is_online) {
          console.log(`✅ Sending notification to ${receiver.userData.email} (Socket: ${receiver.userData.socketId})`);
          io.to(receiver.userData.socketId).emit("get-notification", notificationData);
          socket.emit("notification-sent", {
            success: true,
            message: "Notification sent successfully",
            notificationId: notificationData.id,
          });
        } else {
          console.log(`⚠️ Receiver ${receiver_id} is offline. Notification saved.`);
          socket.emit("notification-sent", {
            success: true,
            message: "Notification saved. Receiver is offline.",
            notificationId: notificationData.id,
          });
        }
      } catch (error) {
        console.error("❌ Error in send-notification:", error);
        socket.emit("notification-error", {
          error: "Failed to send notification",
          details: error.message,
        });
      }
    });

    // ============================================
    // TEST NOTIFICATION
    // ============================================
    socket.on("test-send-notification", (data) => {
      console.log("🧪 Test notification request:", data);

      const testNotification = {
        id: `test-${Date.now()}`,
        message: data.message || "This is a test notification",
        notification_type: 1,
        type: 1,
        content_id: 999,
        sender_id: "system",
        receiver_id: data.receiver_id,
        sender_name: "System",
        sender_first_name: "System",
        sender_last_name: "",
        first_name: "System",
        last_name: "",
        is_read: 0,
        is_broadcast: false,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const receiver = getUser(data.receiver_id);

      if (receiver && receiver.userData && receiver.userData.socketId) {
        io.to(receiver.userData.socketId).emit("get-notification", testNotification);
        socket.emit("test-result", {
          success: true,
          message: "Test notification sent",
          receiverSocketId: receiver.userData.socketId,
        });
      } else {
        socket.emit("test-result", {
          success: false,
          message: "Receiver not found online",
          receiver_id: data.receiver_id,
        });
      }
    });

    // ============================================
    // ROOM HANDLING
    // ============================================
    socket.on("start-class", (data) => {
      socket.join(data.room);
      console.log(`🏫 User joined class room: ${data.room}`);
    });

    socket.on("join-room", (data) => {
      console.log("🚪 User joined room:", data.room);
      socket.join(data.room);
      socket.emit("user-joined", data);
    });

    socket.on("send-message", (data) => {
      console.log("📨 Room message:", data);
      const receiver = getUser(data?.to);

      if (receiver && receiver.userData.is_online) {
        console.log(`📤 Sending to: ${receiver.userData.socketId}`);
        socket.to(receiver.userData.socketId).emit("receive-message", data);
      } else {
        console.log(`⚠️ Receiver ${data?.to} not found or offline`);
      }

      if (data?.room) {
        appendMessageToRoomFile(data.room, data);
      }
    });

    socket.on("user-disconnected", (data) => {
      console.log(`👋 User disconnected from room: ${data.room}`);
      socket.broadcast.to(data.room).emit("user-left", {
        user: data.user,
        userId: data.userId,
      });
    });

    // ============================================
    // DISCONNECTION HANDLING
    // ============================================
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      console.log(`📊 Reason: ${reason}`);
      console.log(`📊 Remaining connections: ${io.engine.clientsCount}`);

      removeUser(socket.id);

      setTimeout(() => {
        io.emit("USER_ADDED", onlineUsers);
      }, 1000);
    });

    // ============================================
    // EXPLICIT USER REMOVAL
    // ============================================
    socket.on("USER_REMOVED", (data) => {
      const userId = data.id || data.userId;

      console.log(`👋 User explicitly logging out: ${userId}`);

      const userSockets = onlineUsers.filter(
        (user) => user.userData.id == userId
      );

      onlineUsers = onlineUsers.filter(
        (user) => user.userData.id != userId
      );

      if (mysqlcon) {
        try {
          const query = `UPDATE users SET is_online = 'false', updatedAt = NOW() WHERE id = ?`;
          mysqlcon.query(query, [userId], (err, result) => {
            if (err) {
              // BUG FIX 5: was userData.id (undefined in this scope) — use userId instead
              console.error(`❌ Database error updating online status for user ${userId}:`, err);
            }
          });
        } catch (error) {
          console.log("Error while removing user", error);
        }
      }

      console.log(`✅ Removed ${userSockets.length} socket(s) for user ${userId}`);
      io.emit("USER_ADDED", onlineUsers);
    });

    // ============================================
    // CONNECTION ERROR HANDLING
    // ============================================
    socket.on("error", (error) => {
      console.error(`❌ Socket error on ${socket.id}:`, error);
    });
  });

  // ============================================
  // SERVER-LEVEL ERROR HANDLING
  // ============================================
  io.engine.on("connection_error", (err) => {
    console.error("❌ Connection error:", err);
  });

  console.log("✅ Socket.IO server initialized and ready");
  console.log(`📊 Configuration:`, {
    pingTimeout: "60000ms",
    pingInterval: "25000ms",
    connectionStateRecovery: "2 minutes",
    reconnection: "enabled",
  });
};

module.exports = { app, http, InitSocket };