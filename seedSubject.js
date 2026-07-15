// // seedSubjects.js
const subjectData = require("./class_subject.json"); // your JSON file
const { DBMODELS } = require("./models/init-models"); // Sequelize models

async function seedSubjects() {
  try {
    // Loop through top-level groups (SchoolSubjects, Graduation, Diploma, PostGraduation)
    for (const [courseGroup, courseData] of Object.entries(subjectData)) {
      // courseGroup = "SchoolSubjects" / "Graduation" / "Diploma" / "PostGraduation"
      // courseData = the object inside

      for (const [className, details] of Object.entries(courseData)) {
        const category = details.Category;
        const subjects = details.Subjects;
        
        // subjects should always be array here (based on your JSON)
        await DBMODELS.subject.create({
          course_name: courseGroup,    // e.g. SchoolSubjects / Graduation
          class_name: className,       // e.g. 1-5, 6-9, BSc-PCM, Diploma-CSE
          category: category,          // e.g. Science, PCM, Commerce
          subject_name: subjects, // store subjects array as string
        });
      }
    }

    console.log("✅ Subjects seeded successfully!");
  } catch (err) {
    console.error("❌ Error seeding subjects:", err);
  }
}

seedSubjects();






// const {
//   createNotification,
//   sendNotificationToInstitution
// } = require("./service/notify");
// const { appendMessageToRoomFile, getRoomChatData } = require("./utils/chatStore");
// const { logg } = require("./utils/utils");
// const Users = require('./models/users'); // left as-is (unused), per your request not to change other code
// const { saveMsg } = require("./controllers/messages.controller");

// // ✅ Use your existing MySQL connection to update is_online
// const { mysqlcon } = require("./model/db");

// const app = require("express")();
// const http = require("http").createServer(app);
// const io = require("socket.io")(http, { cors: { origin: "*" } });

// let onlineUsers = [];

// Add or update user in onlineUsers + set is_online = 1
// const addNewUser = async (userData, socketId) => {
//   if (!userData || !userData.id) {
//     console.error("User data is missing or invalid", userData);
//     return;
//   }

//   const existingUserIndex = onlineUsers.findIndex(
//     (user) => user.userData.id === userData.id
//   );

//   if (existingUserIndex !== -1) {
//     onlineUsers[existingUserIndex].userData.socketId = socketId;
//   } else {
//     onlineUsers.push({ userData: { ...userData, socketId } });
//   }

//   // ✅ Update DB is_online = 1 (true)
//   try {
//     await mysqlcon
//       .promise()
//       .query("UPDATE users SET is_online = 1 WHERE id = ?", [userData.id]);
//   } catch (err) {
//     console.error("DB error setting user online:", err);
//   }

//   console.log(
//     "Updated Online users after addition:",
//     JSON.stringify(onlineUsers, null, 2)
//   );
//   io.emit("USER_ADDED", onlineUsers);
// // };

// const addNewUser = async (userData, socketId) => {
//   if (!userData?.id) {
//     console.log("Invalid userData received:", userData);
//     return;
//   }

//   // ✅ Update DB
//   try {
//     const [result]= await mysqlcon
//       .promise()
//       .query("UPDATE users SET is_online = 'true' WHERE id = ?"
// , [userData.id]);
//        console.log("DB update result:", result);  // 👈 log query result
//   console.log("Tried to update user id:", userData.id);
//   } catch (err) {
//     console.error("DB error setting user online:", err);
//   }

//   // ✅ Clean up existing entry
//   onlineUsers = onlineUsers.filter(
//     (user) => user.userData.id !== userData.id
//   );

//   // ✅ Push correct online flag
//   onlineUsers.push({
//     userData: {
//       id: userData.id,
//       first_name: userData.first_name,
//       last_name: userData.last_name,
//       email: userData.email,
//       phone: userData.phone,
//       role: userData.role,
//       profile: userData.profile,
//       is_online: true,   // ✅ correct field
//       socketId,
//     },
//   });

//   console.log("Updated Online users after addition:", onlineUsers);
// };

// console.log("onlineUsers______________",onlineUsers)

// const getSocketId = (userId) => {
//   const userOnline = onlineUsers.find((online) => online.userData.id == userId);
//   if (userOnline) {
//     return userOnline.userData.socketId;
//   }
//   return null;
// };

// // Remove user by socketId + set is_online = 0
// const removeUser = async (socketId) => {
//   const index = onlineUsers.findIndex(
//     (user) => user.userData.socketId === socketId
//   );
//   if (index !== -1) {
//     const removedUser = onlineUsers[index];
//     console.log("Removing user:", removedUser);

//     // ✅ Update DB is_online = 0 (false)
//     try {
//      const [resulte]= await mysqlcon
//         .promise()
//         .query("UPDATE users SET is_online = 'false' WHERE id = ?"
// , [
//           removedUser.userData.id,
//         ]);
//         console.log("After remove user ",resulte)
//     } catch (err) {


//       console.error("DB error setting user offline:", err);
//     }

//     onlineUsers.splice(index, 1);
//   }
// };

// Backup socket

// Remove user by socketId or userId and update DB
// const removeUser = async ({ socketId = null, userId = null }) => {
//   let removedUser = null;

//   if (userId) {
//     const index = onlineUsers.findIndex((u) => u.userData.id === userId);
//     if (index !== -1) {
//       removedUser = onlineUsers.splice(index, 1)[0];
//     }
//   } else if (socketId) {
//     const index = onlineUsers.findIndex(
//       (u) => u.userData.socketId === socketId
//     );
//     if (index !== -1) {
//       removedUser = onlineUsers.splice(index, 1)[0];
//     }
//   }

//   const idToUpdate = removedUser ? removedUser.userData.id : userId;

//   if (idToUpdate) {
//     try {
//       const [result] = await mysqlcon
//         .promise()
//         .query("UPDATE users SET is_online = 'false' WHERE id = ?", [idToUpdate]);
//       console.log("DB update for logout result:", result);
//     } catch (err) {
//       console.error("DB error setting user offline:", err);
//     }
//   }
// };


// const getUser = (userId) => {
//   return onlineUsers.find((user) => user.userData.id === userId);
// };

// const InitSocket = () => {
//   io.on("connection", (socket) => {
//     socket.on("ADD_USER", async (userData) => {
//       await addNewUser(userData, socket.id);
//       io.emit("USER_ADDED", onlineUsers);
//     });

//     socket.on("SEND_MSG", async (msg) => {
//       console.log("Message received from frontend:", msg);

//       // Save message first
//       try {
//         const result = await saveMsg(msg);
//         console.log("Message saved successfully:", result);
//         io.emit("MESSAGE_SAVED", result);
//       } catch (error) {
//         console.error("Error saving message:", error);
//         socket.emit("SAVE_MSG_ERROR", "Failed to save message");
//         return;
//       }

//       // Forward to receiver if online
//       const receiver = getUser(msg.receiver);
//       if (receiver && receiver.userData.socketId) {
//         io.to(receiver.userData.socketId).emit("RECIVED_MSG", msg);
//       } else {
//         console.log(
//           "Cannot emit: receiver not found or receiver's socket ID is missing."
//         );
//       }
//     });

//     socket.on(
//       "send-notification",
//       ({
//         sender_role,
//         receiver_role,
//         sender_name,
//         sender_id,
//         receiver_id,
//         type,
//         content_id,
//         message = "You got a new notification",
//       }) => {
//         console.log("Notification Data: ", {
//           sender_role,
//           receiver_role,
//           sender_name,
//           sender_id,
//           receiver_id,
//           type,
//           content_id,
//           message,
//         });

//         // Create & persist the notification
//         createNotification(
//           sender_role,
//           receiver_role,
//           sender_id,
//           receiver_id,
//           type,
//           content_id,
//           message
//         );

//         // If receiver is connected, push in realtime
//         const receiver = getUser(receiver_id);
//         if (receiver && receiver.userData.socketId) {
//           socket.to(receiver.userData.socketId).emit("get-notification", {
//             sender_name,
//             type,
//           });
//         }
//       }
//     );

//     // Tutor Events
//     socket.on("start-class", (data) => {
//       socket.join(data.room);
//     });

//     // User events
//     socket.on("join-room", (data) => {
//       logg.info("User joined", data);
//       console.log("User joined", data);
//       socket.join(data.room);
//       socket.emit("user-joined", data);
//       // getRoomChatData(data.room);
//     });

//     socket.on("send-message", (data) => {
//       console.log("Online Users line no 87 -------- : ", onlineUsers);
//       const receiver = getUser(data?.to);
//       logg.info("User sent message", data);
//       console.log("User sent message", data);
//       console.log("Reciver : ", receiver);
//       if (receiver) {
//         console.log("Sending message to:", receiver.userData.socketId);
//         socket.to(receiver.userData.socketId).emit("receive-message", data);
//       } else {
//         console.log("Receiver not found for user ID:", data?.to);
//       }
//       appendMessageToRoomFile(data?.room, data);
//     });

//     socket.on("user-disconnected", (data) => {
//       socket.broadcast
//         .to(data.room)
//         .emit("user-left", { user: data.user, userId: data.userId });
//     });

//     // Explicit logout: remove by userId
//     socket.on("USER_REMOVED", async (data) => {
//       console.log("User logging out:", data);
//       const u = onlineUsers.find((x) => x.userData.id === data.userId);
//       if (u) {
//         await removeUser(u.userData.socketId);
//       } else {
//         // If not found in memory, still ensure DB is set offline
//         try {
//         const [resulte] =   await mysqlcon
//             .promise()
//             .query("UPDATE users SET is_online = 'false' WHERE id = ?", [
//               data.id,
//             ]);
//             console.log("Removing the user ",resulte)
//         } catch (err) {
//           console.error("DB error setting user offline (explicit):", err);
//         }
//       }
//       io.emit("USER_ADDED", onlineUsers);
//     });

//     // Single disconnect handler
//   socket.on("disconnect", async () => {
//   logg.info("User disconnected");
//   console.log("Disconnected: ", socket.id);
//   await removeUser({ socketId: socket.id });   // ✅ FIX
//   io.emit("USER_ADDED", onlineUsers);
// });

//   });
// };

// module.exports = { app, http, InitSocket };





