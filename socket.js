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
const { verifyJWT } = require("./service/auth.service");

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
    (user) => String(user.userData.id) === String(userData.id)
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
const isOnlineFlag = (flag) =>
  !(flag === false || flag === "false" || flag === 0);

const getUser = (userId) => {
  const user = onlineUsers.find(
    (user) => String(user.userData.id) === String(userId)
  );

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
      // Keep Experts list honest — clear stale is_online in DB
      if (mysqlcon && user.userData?.id) {
        mysqlcon.query(
          `UPDATE users SET is_online = 'false', updatedAt = NOW() WHERE id = ?`,
          [user.userData.id],
          () => {}
        );
      }
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
    socket.on("ADD_USER", async (userData) => {
      if (!userData) {
        socket.emit("CONNECTION_ERROR", {
          error: "Invalid user data",
          message: "User data is required",
        });
        return;
      }

      // Bind identity to JWT — ignore spoofed client ids
      const rawToken =
        userData.token ||
        socket.handshake?.auth?.token ||
        (socket.handshake?.headers?.authorization || "").replace(/^Bearer\s+/i, "");
      if (!rawToken || !process.env.JWT_SECRET) {
        socket.emit("CONNECTION_ERROR", {
          error: "Unauthorized",
          message: "Valid auth token required to register on socket",
        });
        return;
      }

      let verified;
      try {
        verified = await verifyJWT(String(rawToken).replace(/^Bearer\s+/i, ""), process.env.JWT_SECRET);
      } catch (err) {
        socket.emit("CONNECTION_ERROR", {
          error: "Unauthorized",
          message: "Invalid or expired token",
        });
        return;
      }

      const jwtUser = verified?.data || verified;
      const boundId = jwtUser?.id;
      if (!boundId) {
        socket.emit("CONNECTION_ERROR", {
          error: "Unauthorized",
          message: "Token missing user id",
        });
        return;
      }

      const safeUser = {
        id: boundId,
        email: jwtUser.email || userData.email,
        first_name: userData.first_name || jwtUser.first_name,
        last_name: userData.last_name || jwtUser.last_name,
        username: userData.username || jwtUser.username,
        role: jwtUser.role || userData.role,
        avatar_url: userData.avatar_url,
      };

      const addedUser = addNewUser(safeUser, socket.id);

      socket.emit("CONNECTION_SUCCESS", {
        message: "Socket connection established and user added",
        socketId: socket.id,
        userId: boundId,
        timestamp: new Date().toISOString(),
        onlineUsersCount: onlineUsers.length,
        userData: addedUser.userData,
      });

      io.emit("USER_ADDED", onlineUsers);
    });

    // ============================================
    // HEARTBEAT HANDLING
    // ============================================
    socket.on("USER_HEARTBEAT", () => {
      // Heartbeat only for this socket's registered user
      const userIndex = onlineUsers.findIndex(
        (user) =>
          user.userData?.socketId === socket.id || user.socketId === socket.id
      );

      if (userIndex !== -1) {
        const uid = onlineUsers[userIndex].userData.id;
        onlineUsers[userIndex].userData.last_seen = new Date().toISOString();
        onlineUsers[userIndex].userData.is_online = true;
        console.log(`💓 Heartbeat received from user ${uid} (${onlineUsers[userIndex].userData.email})`);
      } else {
        console.log(`⚠️ Heartbeat from unregistered socket: ${socket.id}`);
      }
    });

    socket.on("heartbeat", () => {
      const userIndex = onlineUsers.findIndex(
        (user) =>
          user.userData?.socketId === socket.id || user.socketId === socket.id
      );
      if (userIndex !== -1) {
        onlineUsers[userIndex].userData.last_seen = new Date().toISOString();
        onlineUsers[userIndex].userData.is_online = true;
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
      // Bind sender to the socket's registered user — ignore spoofed sender ids
      // socketId lives on userData (see addNewUser), not the wrapper object
      let registered = onlineUsers.find(
        (u) =>
          u.userData?.socketId === socket.id || u.socketId === socket.id
      );

      // Race fix: SEND_MSG can arrive before ADD_USER finishes — auto-bind via JWT
      if (!registered?.userData?.id) {
        const rawToken =
          msg?.token ||
          socket.handshake?.auth?.token ||
          (socket.handshake?.headers?.authorization || "").replace(
            /^Bearer\s+/i,
            ""
          );
        if (rawToken && process.env.JWT_SECRET) {
          try {
            const verified = await verifyJWT(
              String(rawToken).replace(/^Bearer\s+/i, ""),
              process.env.JWT_SECRET
            );
            const jwtUser = verified?.data || verified;
            if (jwtUser?.id) {
              registered = addNewUser(
                {
                  id: jwtUser.id,
                  email: jwtUser.email,
                  first_name: jwtUser.first_name,
                  last_name: jwtUser.last_name,
                  username: jwtUser.username,
                  role: jwtUser.role,
                },
                socket.id
              );
            }
          } catch (_) {
            /* fall through to error */
          }
        }
      }

      if (!registered?.userData?.id) {
        socket.emit("SAVE_MSG_ERROR", {
          error: "Not authenticated on socket",
          details: "Register with ADD_USER before sending",
        });
        return;
      }
      const boundSenderId = registered.userData.id;
      const boundRole = registered.userData.role || msg.sender_role;
      msg.sender = boundSenderId;
      if (boundRole === "institute") {
        msg.sender_institute_id = boundSenderId;
        msg.sender_user_id = null;
        msg.sender_role = "institute";
      } else {
        msg.sender_user_id = boundSenderId;
        msg.sender_institute_id = null;
        msg.sender_role = boundRole || msg.sender_role;
      }

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

      // Always ack the sending socket; also fan out via roster socketIds
      socket.emit("MESSAGE_SAVED", savedMessage);
      socket.emit("RECEIVED_MSG", messageToSend);

      const sender = getUser(msg.sender);
      if (
        sender?.userData?.socketId &&
        sender.userData.socketId !== socket.id
      ) {
        io.to(sender.userData.socketId).emit("RECEIVED_MSG", messageToSend);
      }

      const receiver = getUser(msg.receiver);
      // Deliver whenever peer has an active socket — roster membership is enough
      if (receiver?.userData?.socketId) {
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
      // Bind sender to the socket's registered user — ignore spoofed sender_id
      const registered = onlineUsers.find(
        (u) =>
          u.userData?.socketId === socket.id || u.socketId === socket.id
      );
      if (!registered?.userData?.id) {
        socket.emit("notification-error", {
          error: "Not authenticated on socket",
          details: "Register with ADD_USER before sending notifications",
        });
        return;
      }
      const boundSenderId = registered.userData.id;
      const boundRole = registered.userData.role || sender_role;
      const boundName =
        sender_name ||
        [registered.userData.first_name, registered.userData.last_name]
          .filter(Boolean)
          .join(" ") ||
        "User";

      try {
        const notification = await createNotification(
          boundRole,
          receiver_role,
          boundSenderId,
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
            sender_id: notification.sender_id || boundSenderId,
            receiver_id: notification.receiver_id || receiver_id,
            sender_name: boundName,
            sender_first_name: boundName ? boundName.split(" ")[0] : "User",
            sender_last_name: boundName ? boundName.split(" ").slice(1).join(" ") : "",
            first_name: boundName ? boundName.split(" ")[0] : "User",
            last_name: boundName ? boundName.split(" ").slice(1).join(" ") : "",
            is_read: notification.is_read || 0,
            is_broadcast: notification.is_broadcast || false,
            createdAt: notification.createdAt || notification.created_at || new Date().toISOString(),
            created_at: notification.createdAt || notification.created_at || new Date().toISOString(),
            ...notification,
            sender_id: boundSenderId,
          };
        } else {
          notificationData = {
            id: notification,
            message: message,
            notification_type: type,
            type: type,
            content_id: content_id,
            sender_id: boundSenderId,
            receiver_id: receiver_id,
            sender_name: boundName,
            sender_first_name: boundName ? boundName.split(" ")[0] : "User",
            sender_last_name: boundName ? boundName.split(" ").slice(1).join(" ") : "",
            first_name: boundName ? boundName.split(" ")[0] : "User",
            last_name: boundName ? boundName.split(" ").slice(1).join(" ") : "",
            is_read: 0,
            is_broadcast: false,
            createdAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
        }

        const receiver = getUser(receiver_id);

        if (
          receiver &&
          receiver.userData &&
          receiver.userData.socketId &&
          isOnlineFlag(receiver.userData.is_online)
        ) {
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
    // TEST NOTIFICATION (disabled — spoofing vector)
    // ============================================
    socket.on("test-send-notification", () => {
      socket.emit("notification-error", {
        error: "Test notifications are disabled",
      });
    });

    // ============================================
    // WALL VOTE LIVE COUNTS
    // ============================================
    socket.on("VOTE_UPDATED", (payload) => {
      if (!payload?.questionId) return;
      // Broadcast so Home + Wall viewers see updated like/dislike counts
      socket.broadcast.emit("VOTE_UPDATED", {
        questionId: payload.questionId,
        upvotes: Number(payload.upvotes) || 0,
        downvotes: Number(payload.downvotes) || 0,
      });
    });

    socket.on("COMMENT_UPDATED", (payload) => {
      if (!payload?.questionId) return;
      socket.broadcast.emit("COMMENT_UPDATED", {
        questionId: payload.questionId,
        commentCount: Number(payload.commentCount) || 0,
      });
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
      // Bind to this socket's registered user — ignore spoofed client ids
      const registered = onlineUsers.find(
        (u) =>
          u.userData?.socketId === socket.id || u.socketId === socket.id
      );
      const boundId = registered?.userData?.id;
      if (!boundId) {
        console.log(`⚠️ USER_REMOVED ignored — socket ${socket.id} not registered`);
        return;
      }
      const claimed = data?.id || data?.userId;
      if (claimed != null && String(claimed) !== String(boundId)) {
        console.log(
          `⚠️ USER_REMOVED spoof blocked: claimed=${claimed} bound=${boundId}`
        );
      }
      const userId = boundId;

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
          mysqlcon.query(query, [userId], (err) => {
            if (err) {
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

/** Push an in-app notification to a user if they are currently online. */
const pushNotificationToUser = (userId, notificationData) => {
  try {
    const receiver = getUser(userId);
    if (
      receiver?.userData?.socketId &&
      isOnlineFlag(receiver.userData.is_online)
    ) {
      io.to(receiver.userData.socketId).emit(
        "get-notification",
        notificationData
      );
      return true;
    }
  } catch (e) {
    console.error("pushNotificationToUser:", e?.message || e);
  }
  return false;
};

const getIO = () => io;

module.exports = { app, http, InitSocket, pushNotificationToUser, getUser, getIO };