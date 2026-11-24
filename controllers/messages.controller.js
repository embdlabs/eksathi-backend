const { DataTypes } = require("sequelize");
const { mysqlcon, sequelize } = require("../model/db");
const { DBMODELS } = require("../models/init-models");
const users = require("../models/users")(sequelize, DataTypes);
const messages = require("../models/messages");
const fs = require("fs");
const path = require("path");
const { assertCleanMessage } = require("../utils/chatModeration");
const { isUserInRoomId, assertUserInRooms } = require("../utils/roomMembership");

const saveMsg = async (msg) => {
  const messageContent = msg.message?.title
    ? `${msg.message.title}\n${msg.message.description}`
    : msg.message;
  assertCleanMessage(
    typeof messageContent === "string"
      ? messageContent
      : String(messageContent || "")
  );

  let senderField = null;
  let receiverField = null;

  if (
    msg.sender_role === "student" ||
    msg.sender_role === "teacher" ||
    msg.sender_role === "professional"
  ) {
    senderField = "sender_user_id";
  } else {
    senderField = "sender_institute_id";
  }

  if (msg.receiver_role === "institute") {
    receiverField = "receiver_institute_id";
  } else {
    receiverField = "receiver_user_id";
  }

  let senderId = msg.sender;
  if (msg.sender_user_id !== undefined && msg.sender_user_id !== null) {
    senderId = msg.sender_user_id;
  } else if (
    msg.sender_institute_id !== undefined &&
    msg.sender_institute_id !== null
  ) {
    senderId = msg.sender_institute_id;
  }

  if (typeof senderId === "object" && senderId !== null) {
    console.error(
      "❌ Invalid sender ID - received object instead of number:",
      senderId
    );
    throw new Error("Invalid sender ID format");
  }

  let receiverId = msg.receiver;
  if (msg.receiver_user_id !== undefined && msg.receiver_user_id !== null) {
    receiverId = msg.receiver_user_id;
  } else if (
    msg.receiver_institute_id !== undefined &&
    msg.receiver_institute_id !== null
  ) {
    receiverId = msg.receiver_institute_id;
  }

  if (typeof receiverId === "object" && receiverId !== null) {
    console.error(
      "❌ Invalid receiver ID - received object instead of number:",
      receiverId
    );
    throw new Error("Invalid receiver ID format");
  }

  const messageData = {
    [senderField]: senderId,
    [receiverField]: receiverId,
    message: messageContent,
    room_id: msg.room,
    time_to_send: new Date(),
  };
  try {
    const savedMessage = await DBMODELS.messages.create(messageData);

    const formattedMessage = {
      id: savedMessage.id,
      message: savedMessage.message || "",
      msg: savedMessage.message || "",
      room: msg.room || savedMessage.room_id,
      room_id: savedMessage.room_id || msg.room,
      sender: senderId,
      receiver: receiverId,
      sender_user_id: msg.sender_role !== "institute" ? senderId : null,
      sender_institute_id: msg.sender_role === "institute" ? senderId : null,
      receiver_user_id: msg.receiver_role !== "institute" ? receiverId : null,
      receiver_institute_id:
        msg.receiver_role === "institute" ? receiverId : null,
      sender_role: msg.sender_role,
      receiver_role: msg.receiver_role,
      time_to_send: savedMessage.time_to_send,
      createdAt: savedMessage.createdAt,
      updatedAt: savedMessage.updatedAt,
    };

    return formattedMessage;
  } catch (error) {
    console.error("Error saving message:", error);
    throw new Error("Server Error");
  }
};

const getMsg = async (roomId) => {
  console.log(`Fetching messages for roomId: ${roomId}`);
  try {
    if (!roomId) {
      throw new Error("Invalid roomId");
    }

    const roomIdStr = String(roomId);

    const messages = await DBMODELS.messages.findAll({
      where: {
        room_id: roomIdStr,
      },
      include: [
        {
          model: DBMODELS.users,
          as: "sender",
          attributes: [
            "id",
            "username",
            "role",
            "display_name",
            "first_name",
            "last_name",
            "avatar_url",
          ],
          required: false,
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const formattedMessages = messages.map((msg) => {
      const msgData = msg.toJSON ? msg.toJSON() : msg;
      return {
        id: msgData.id,
        message: msgData.message || "",
        msg: msgData.message || "",
        room: msgData.room_id,
        room_id: msgData.room_id,
        sender_user_id: msgData.sender_user_id,
        sender_institute_id: msgData.sender_institute_id,
        receiver_user_id: msgData.receiver_user_id,
        receiver_institute_id: msgData.receiver_institute_id,
        time_to_send: msgData.time_to_send,
        createdAt: msgData.createdAt,
        updatedAt: msgData.updatedAt,
        is_read: msgData.is_read ? 1 : 0,
        sender: msgData.sender || null,
      };
    });

    console.log(
      `✅ Found ${formattedMessages.length} messages for roomId ${roomIdStr}`
    );
    return formattedMessages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

/** Authenticated: only the JWT user may fetch their own inbox index. */
const getMessagesByUserId = async (req, res) => {
  const authId = req.user?.id;
  const paramId = req.params.userId;

  if (!authId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (paramId != null && String(paramId) !== String(authId)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const userId = authId;

  try {
    const results = await sequelize.query(
      `
            SELECT id, sender_user_id, receiver_user_id, sender_institute_id,
                   receiver_institute_id, message, room_id, time_to_send, createdAt, updatedAt,
                   COALESCE(is_read, 0) AS is_read
            FROM messages
            WHERE sender_user_id = :userId OR receiver_user_id = :userId;
        `,
      {
        replacements: { userId: userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "No messages found." });
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/** Authenticated room fetch with membership check. */
const getMessagesByRoom = async (req, res) => {
  const roomId = req.params.roomId;
  const authId = req.user?.id;

  if (!roomId) {
    return res.status(400).json({ error: "Room ID is required" });
  }
  if (!authId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!isUserInRoomId(roomId, authId)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    // Opening a room marks inbound messages as read for the JWT user
    try {
      await sequelize.query(
        `UPDATE messages SET is_read = 1
         WHERE room_id = :roomId
           AND receiver_user_id = :authId
           AND (is_read = 0 OR is_read IS NULL)`,
        {
          replacements: { roomId, authId },
          type: sequelize.QueryTypes.UPDATE,
        }
      );
    } catch (markErr) {
      // Column may be missing on older DBs — still return messages
      console.warn("mark-read skipped:", markErr?.message || markErr);
    }

    const messages = await getMsg(roomId);
    return res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Error fetching messages" });
  }
};

/** Delete all messages in a room — caller must be a participant. */
const deleteChatByRoom = async (req, res) => {
  const roomId = String(req.params.roomId || "").trim();
  const altRoomId = req.query.altRoomId
    ? String(req.query.altRoomId).trim()
    : null;
  const authId = req.user?.id;

  if (!roomId) {
    return res.status(400).json({ message: "Room ID is required" });
  }
  if (!authId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rooms =
    altRoomId && altRoomId !== roomId ? [roomId, altRoomId] : [roomId];
  if (!assertUserInRooms(authId, rooms)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const [result] = await mysqlcon.promise().query(
      `DELETE FROM messages WHERE room_id IN (?)`,
      [rooms]
    );
    return res.status(200).json({
      message: "Chat deleted",
      deleted: result?.affectedRows || 0,
    });
  } catch (error) {
    console.error("deleteChatByRoom:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  saveMsg,
  getMsg,
  getMessagesByUserId,
  getMessagesByRoom,
  deleteChatByRoom,
};
