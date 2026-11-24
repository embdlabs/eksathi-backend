/**
 * In-app notification + email for connection request / accept.
 * Failures are logged only — never block the connection flow.
 */

const { mysqlcon } = require("../model/db");
const sendEmailService = require("../utils/email");

const getUserLite = async (userId) => {
  const [rows] = await mysqlcon.promise().query(
    `SELECT id, email, first_name, last_name, username,
            TRIM(CONCAT(IFNULL(first_name,''),' ',IFNULL(last_name,''))) AS name
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const insertNotification = async ({
  senderId,
  receiverId,
  type,
  contentId,
  message,
}) => {
  // Set both receiver_user_id and legacy receiver_id so all readers see it
  const [result] = await mysqlcon.promise().query(
    `INSERT INTO notifications
      (sender_user_id, receiver_user_id, receiver_id, notification_type, content_id, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [senderId, receiverId, receiverId, type, contentId || null, message]
  );
  const notificationId = result?.insertId;
  try {
    const { pushNotificationToUser } = require("../socket");
    pushNotificationToUser(receiverId, {
      id: notificationId,
      message,
      notification_type: type,
      type,
      content_id: contentId || null,
      sender_id: senderId,
      receiver_id: receiverId,
      is_read: 0,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (_) {
    /* socket may not be ready in some contexts */
  }
  return notificationId;
};

const emailBoth = (toList, subject, html) => {
  toList.filter(Boolean).forEach((email) => {
    try {
      sendEmailService.sendEmailService(email, subject, html);
    } catch (e) {
      console.error("connection email failed:", email, e?.message || e);
    }
  });
};

/** After a connection request is sent */
const notifyConnectionRequest = async (senderId, receiverId, connectionId) => {
  try {
    const [sender, receiver] = await Promise.all([
      getUserLite(senderId),
      getUserLite(receiverId),
    ]);
    if (!sender || !receiver) return;

    const senderName = sender.name?.trim() || sender.username || "Someone";
    const receiverName = receiver.name?.trim() || receiver.username || "there";

    await insertNotification({
      senderId,
      receiverId,
      type: 4, // connection request
      contentId: connectionId,
      message: `${senderName} sent you a connection request`,
    });
    await insertNotification({
      senderId: receiverId,
      receiverId: senderId,
      type: 4,
      contentId: connectionId,
      message: `You sent a connection request to ${receiverName}`,
    });

    emailBoth(
      [receiver.email],
      `${senderName} sent you a connection request on EkSathi`,
      `<p>Hi ${receiverName},</p>
       <p><strong>${senderName}</strong> sent you a connection request on EkSathi.</p>
       <p><a href="https://www.eksathi.com/">View and respond</a></p>`
    );
    emailBoth(
      [sender.email],
      `Connection request sent to ${receiverName}`,
      `<p>Hi ${senderName},</p>
       <p>Your connection request to <strong>${receiverName}</strong> was sent successfully.</p>
       <p><a href="https://www.eksathi.com/">Open EkSathi</a></p>`
    );
  } catch (err) {
    console.error("notifyConnectionRequest:", err?.message || err);
  }
};

/** After a connection is accepted */
const notifyConnectionAccepted = async (senderId, receiverId, connectionId) => {
  try {
    const [sender, receiver] = await Promise.all([
      getUserLite(senderId),
      getUserLite(receiverId),
    ]);
    if (!sender || !receiver) return;

    const senderName = sender.name?.trim() || sender.username || "A member";
    const receiverName = receiver.name?.trim() || receiver.username || "A member";

    const msg = `${senderName} and ${receiverName} are connected now`;

    await insertNotification({
      senderId: receiverId,
      receiverId: senderId,
      type: 5, // connection accepted
      contentId: connectionId,
      message: `${receiverName} accepted your connection request`,
    });
    await insertNotification({
      senderId,
      receiverId,
      type: 5,
      contentId: connectionId,
      message: `You are now connected with ${senderName}`,
    });

    emailBoth(
      [sender.email, receiver.email],
      msg,
      `<p>Good news!</p>
       <p><strong>${senderName}</strong> and <strong>${receiverName}</strong> are connected now on EkSathi.</p>
       <p><a href="https://www.eksathi.com/">View profiles</a></p>`
    );
  } catch (err) {
    console.error("notifyConnectionAccepted:", err?.message || err);
  }
};

module.exports = {
  notifyConnectionRequest,
  notifyConnectionAccepted,
  insertNotification,
  getUserLite,
};
