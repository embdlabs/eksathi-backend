// const { mysqlcon } = require("../model/db");
// const { findExpertise } = require("../service/utilities.service");

// // check if user exist then send connction requests
// const sendConnectionRequest = async (req, res) => {
//     const { senderId, receiverId } = req.body;
//     console.log("senderID and receiverId is ",req.body)
//     try {
//         // check if sender and receiver exist in the database
//         mysqlcon.query('SELECT * FROM users WHERE id IN (?, ?)', [senderId, receiverId], (error, results) => {
//             if (error) {
//                 console.error(error);
//                 return res.status(500).json({ message: 'Internal server error' });
//             }
//             if (results.length !== 2) {
//                 return res.status(400).json({ message: 'Invalid sender or receiver' });
//             }

//             // check if there is an existing connection request between sender and receiver
//             mysqlcon.query('SELECT * FROM connections WHERE sender_id = ? AND receiver_id = ?', [senderId, receiverId], (error, results) => {
//                 if (error) {
//                     console.error(error);
//                     return res.status(500).json({ message: 'Internal server error' });
//                 }

//                 if (results.length > 0) {
//                     return res.status(400).json({ message: 'Connection request already sent' });
//                 }

//                 // insert new connection request into the database
//                 mysqlcon.query('INSERT INTO connections (sender_id, receiver_id) VALUES (?, ?)', [senderId, receiverId], (error, results) => {
//                     if (error) {
//                         console.error(error);
//                         return res.status(500).json({ message: 'Internal server error' });
//                     }

//                     res.status(200).json({ message: 'Connection request sent' });
//                 });
//             });
//         });
//     } catch (err) {
//         console.log(err);
//         return res.status(500).json({ message: 'Internal server error' });
//     };
// };

// // get those connections which requests are panding
// const pendingRequestsSent = async (req, res) => {
//     const { userId } = req.query;

//     if (!userId) {
//         return res.status(400).json({ message: "User ID is required" });
//     }

//     console.log(`Received request for userId: ${userId}`);

//     try {
//         // Get all pending connection requests for the given user ID
//         const sql = `
//             SELECT users.id, users.username, users.first_name, users.last_name, users.email, users.bio, users.avatar_url, connections.status, connections.id as connectionId
//             FROM connections
//             INNER JOIN users ON connections.receiver_id = users.id
//             WHERE sender_id = ? AND connections.status = 'pending';
//         `;

//         // console.log(`Executing query: ${sql} with userId: ${userId}`);

//         mysqlcon.query(sql, [userId], (err, rows) => {
//             if (err) {
//                 console.error(`Database error: ${err}`);
//                 return res.status(500).json({ message: "Internal Server Error" });
//             }

//             // console.log(`Query result: ${JSON.stringify(rows)}`);

//             if (rows.length === 0) {
//                 return res.status(200).json({ message: "No pending requests found", rows });
//             }

//             return res.status(200).json({ message: 'Requests Found', rows });
//         });

//     } catch (error) {
//         console.error(`Unexpected error: ${error}`);
//         res.status(500).send('Internal server error');
//     }
// };

// const pendingRequestsReceived = async (req, res) => {
//     const { userId } = req.query;

//     // console.log("UserId : ",userId)

//     if (!userId) {
//         return res.status(400).json({ message: "User ID is required" });
//     }

//     console.log(`Received request for userId: ${userId}`);

//     try {
//         // Get all pending connection requests received by the given user ID
//         const sql = `
//             SELECT users.id, users.username, users.first_name, users.last_name, users.email, users.bio, users.avatar_url, connections.status, connections.id as connectionId
//             FROM connections
//             INNER JOIN users ON connections.sender_id = users.id
//             WHERE receiver_id = ? AND connections.status = 'pending';
//         `;

//         // console.log(`Executing query: ${sql} with userId: ${userId}`);

//         mysqlcon.query(sql, [userId], (err, rows) => {
//             if (err) {
//                 console.error(`Database error: ${err}`);
//                 return res.status(500).json({ message: "Internal Server Error" });
//             }

//             // console.log(`Query result: ${JSON.stringify(rows)}`);

//             if (rows.length === 0) {
//                 return res.status(200).json({ message: "No pending requests found", rows });
//             }

//             return res.status(200).json({ message: 'Requests Found', rows });
//         });

//     } catch (error) {
//         console.error(`Unexpected error: ${error}`);
//         res.status(500).send('Internal server error');
//     }
// };
// //To get all the connections
// const getConnections = async (req, res) => {
//     const { userId } = req.query;

//     try {
//         mysqlcon.query(
//             `SELECT DISTINCT users.id, users.username, users.first_name, users.last_name, users.email, users.role, users.bio, users.avatar_url, connections.status
//             FROM connections
//             INNER JOIN users ON (connections.receiver_id = users.id OR connections.sender_id = users.id)
//             WHERE (connections.sender_id = ? OR connections.receiver_id = ?) AND connections.status = 'accepted' AND users.id != ?
//             ORDER BY users.username ASC`,
//             [userId, userId, userId],
//             async (err, connections) => {
//                 if (err) {
//                     console.log(err);
//                     return res.status(500).json({ message: err.message });
//                 }
//                 for (var i = 0; i < connections.length; i++) {
//                     let skills = await findExpertise(connections[i].id);
//                     console.log(typeof skills[0]?.skill_name); // This should print "string" if it's a valid string.
//                     skills = skills[0]?.skill_name ? skills[0]?.skill_name.split(', ') : [];
//                     connections[i] = { ...connections[i], skills };
//                 }
//                 return res.status(200).json({ message: "Connections Found", connections });
//             }
//         );

//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server error');
//     }
// }

// // to check that connection is accepted / panding or rejected by  connection id
// const actionConnection = async (req, res) => {
//     const { connectionId } = req.params;
//     const { action } = req.body; // either 'accept' or 'reject'

//     console.log("connectionId", connectionId)

//     try {
//         // const connection = await Connection.findOne({ where: { id: connectionId } });
//         let sql = `SELECT * FROM connections WHERE id = ${connectionId}`;
//         mysqlcon.query(sql, (err, result) => {
//             if (err) {
//                 console.log(err);
//                 return res.status(500).json({ message: 'Internal Server Error' });
//             }
//             if (result.length === 0) {
//                 return res.status(404).json({ error: 'Connection not found' });
//             } else if (result[0].status !== 'pending') {
//                 return res.status(400).json({ error: 'Connection request has already been processed' });
//             }
//             if (action === 'accept') {
//                 mysqlcon.query(`UPDATE connections SET status = 'accepted' WHERE id = '${result[0].id}'`,
//                     (err) => {
//                         if (err) {
//                             console.log(err);
//                             return res.status(500).json({ message: 'Internal Server Error' });
//                         }
//                         return res.json({ message: 'Connection request has been accepted successfully' });
//                     });
//             } else if (action === 'reject') {
//                 mysqlcon.query(`UPDATE connections SET status = 'rejected' WHERE id = '${result[0].id}'`,
//                     (err) => {
//                         if (err) {
//                             console.log(err);
//                             return res.status(500).json({ message: 'Internal Server Error' });
//                         }
//                         return res.json({ message: 'Connection request has been rejected successfully' });
//                     });
//             } else {
//                 return res.status(400).json({ error: 'Invalid action' });
//             }
//         })

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

// module.exports = {
//     sendConnectionRequest,
//     pendingRequestsSent,
//     pendingRequestsReceived,
//     getConnections,
//     actionConnection
// };

const { mysqlcon } = require("../model/db");
const { findExpertise } = require("../service/utilities.service");
const {
  ensureConnectionPrivacyTables,
  isUserConnectionBlocked,
  getHideBetweenUsers,
} = require("../utils/ensureConnectionPrivacy");

// Generate a unique slug for the question
const generateSlug = (userId, receiverId) => {
  const timestamp = Date.now();
  return `connection-question-${userId}-${receiverId}-${timestamp}`;
};

// Check if user exists then send connection requests
const sendConnectionRequest = async (req, res) => {
  // Bind sender to JWT — ignore client-supplied senderId for auth
  const senderId = req.user?.id;
  const { receiverId } = req.body;

  try {
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }
    // Check if sender and receiver are the same
    if (String(senderId) === String(receiverId)) {
      return res
        .status(400)
        .json({ message: "Cannot send connection request to yourself" });
    }

    // Admin-side connection block (e.g. after abuse report)
    if (await isUserConnectionBlocked(receiverId)) {
      return res.status(403).json({
        message: "This user cannot receive connection requests at this time",
      });
    }
    if (await isUserConnectionBlocked(senderId)) {
      return res.status(403).json({
        message: "Your account cannot send connection requests at this time",
      });
    }

    // Check if sender and receiver exist in the database
    mysqlcon.query(
      "SELECT * FROM users WHERE id IN (?, ?)",
      [senderId, receiverId],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Internal server error" });
        }
        if (results.length !== 2) {
          return res
            .status(400)
            .json({ message: "Invalid sender or receiver" });
        }

        // Check if there is already a connection (accepted, pending, or rejected) between sender and receiver
        mysqlcon.query(
          "SELECT * FROM connections WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
          [senderId, receiverId, receiverId, senderId],
          (error, existingConnections) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: "Internal server error" });
            }

            if (existingConnections.length > 0) {
              const existingConnection = existingConnections[0];

              if (existingConnection.status === "accepted") {
                return res.status(400).json({
                  message: "You are already connected with this user",
                  connectionStatus: "accepted",
                });
              } else if (existingConnection.status === "pending") {
                // Check who sent the pending request
                if (existingConnection.sender_id === senderId) {
                  return res.status(400).json({
                    message:
                      "You have already sent a connection request to this user",
                    connectionStatus: "pending_sent",
                  });
                } else {
                  return res.status(400).json({
                    message:
                      "This user has already sent you a connection request. Please check your received requests.",
                    connectionStatus: "pending_received",
                  });
                }
              } else if (existingConnection.status === "rejected") {
                // Check who rejected the request
                if (
                  existingConnection.sender_id === senderId &&
                  existingConnection.status === "rejected"
                ) {
                  return res.status(400).json({
                    message: "Your previous connection request was rejected",
                    connectionStatus: "rejected",
                  });
                } else if (
                  existingConnection.receiver_id === senderId &&
                  existingConnection.status === "rejected"
                ) {
                  return res.status(400).json({
                    message: "You previously rejected this connection request",
                    connectionStatus: "previously_rejected",
                  });
                }
              }
            }

            // Insert new connection request into the database
            mysqlcon.query(
              "INSERT INTO connections (sender_id, receiver_id) VALUES (?, ?)",
              [senderId, receiverId],
              (error, results) => {
                if (error) {
                  console.error(error);
                  return res
                    .status(500)
                    .json({ message: "Internal server error" });
                }

                try {
                  const {
                    notifyConnectionRequest,
                  } = require("../service/connectionNotify.service");
                  notifyConnectionRequest(
                    senderId,
                    receiverId,
                    results.insertId
                  ).catch(() => {});
                } catch (_) { /* ignore */ }

                res.status(200).json({
                  message: "Connection request sent successfully",
                  connectionId: results.insertId,
                });
              }
            );
          }
        );
      }
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get those connections which requests are pending (sent by user)
const pendingRequestsSent = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Get all pending connection requests for the JWT user (no email)
    const sql = `
            SELECT users.id, users.username, users.first_name, users.last_name, users.role, users.bio, users.avatar_url, connections.status, connections.createdAt, connections.id as connectionId
            FROM connections
            INNER JOIN users ON connections.receiver_id = users.id
            WHERE sender_id = ? AND connections.status = 'pending';
        `;

    mysqlcon.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error(`Database error: ${err}`);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (rows.length === 0) {
        return res
          .status(200)
          .json({ message: "No pending requests found", rows });
      }

      return res.status(200).json({ message: "Requests Found", rows });
    });
  } catch (error) {
    console.error(`Unexpected error: ${error}`);
    res.status(500).send("Internal server error");
  }
};

// Get pending requests received by user
const pendingRequestsReceived = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Get all pending connection requests received by the JWT user (no email)
    const sql = `
            SELECT users.id, users.username, users.first_name, users.last_name, users.role, users.bio, users.avatar_url, connections.status, connections.createdAt, connections.id as connectionId
            FROM connections
            INNER JOIN users ON connections.sender_id = users.id
            WHERE receiver_id = ? AND connections.status = 'pending';
        `;

    mysqlcon.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error(`Database error: ${err}`);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (rows.length === 0) {
        return res
          .status(200)
          .json({ message: "No pending requests found", rows });
      }

      return res.status(200).json({ message: "Requests Found", rows });
    });
  } catch (error) {
    console.error(`Unexpected error: ${error}`);
    res.status(500).send("Internal server error");
  }
};

// To get all the accepted connections
const getConnections = async (req, res) => {
  const { userId } = req.query;

  if (!userId || userId === "undefined" || userId === "null") {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    await ensureConnectionPrivacyTables();
    mysqlcon.query(
      `SELECT DISTINCT users.id, users.username, users.first_name, users.last_name, users.role, users.bio, users.avatar_url,
              connections.status, connections.createdAt, connections.id AS connectionId,
              connections.sender_id, connections.receiver_id,
              h.hidden_by AS hiddenBy, h.createdAt AS hiddenAt
            FROM connections
            INNER JOIN users ON (connections.receiver_id = users.id OR connections.sender_id = users.id)
            LEFT JOIN connection_hides h ON h.connection_id = connections.id
            WHERE (connections.sender_id = ? OR connections.receiver_id = ?) AND connections.status = 'accepted' AND users.id != ?
            ORDER BY users.username ASC`,
      [userId, userId, userId],
      async (err, connections) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: err.message });
        }
        for (var i = 0; i < connections.length; i++) {
          let skills = await findExpertise(connections[i].id);
          skills = skills[0]?.skill_name
            ? skills[0]?.skill_name.split(", ")
            : [];
          const hiddenBy = connections[i].hiddenBy || null;
          const isHidden = Boolean(hiddenBy);
          connections[i] = {
            ...connections[i],
            skills,
            isHidden,
            hiddenBy,
            canUnhide: isHidden && String(hiddenBy) === String(userId),
            // Other party sees limited card when hidden by someone else
            userDisabled:
              isHidden && String(hiddenBy) !== String(userId),
          };
        }
        return res
          .status(200)
          .json({ message: "Connections Found", connections });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

// To check if a connection exists and return its status
const checkConnectionStatus = async (req, res) => {
  // Bind "self" to JWT — ignore client-supplied userId
  const userId = req.user?.id;
  const { otherUserId } = req.query;

  if (!userId || !otherUserId) {
    return res.status(400).json({ message: "Authentication and otherUserId are required" });
  }

  try {
    mysqlcon.query(
      "SELECT id, sender_id, receiver_id, status, createdAt FROM connections WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
      [userId, otherUserId, otherUserId, userId],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (results.length === 0) {
          return res.status(200).json({
            message: "No connection found",
            connectionStatus: "none",
          });
        }

        const connection = results[0];
        let status = connection.status;
        let relationship = "unknown";

        // Determine the relationship from JWT user's perspective
        if (connection.sender_id == userId) {
          relationship = "sender";
        } else if (connection.receiver_id == userId) {
          relationship = "receiver";
        }

        // Attach hide privacy (does not change accepted status — reconnect blocked)
        getHideBetweenUsers(userId, otherUserId)
          .then((hideRow) => {
            const isHidden = Boolean(hideRow?.hidden_by);
            return res.status(200).json({
              message: "Connection found",
              connection: connection,
              connectionStatus: status,
              relationship: relationship,
              isHidden,
              hiddenBy: hideRow?.hidden_by || null,
              canUnhide:
                isHidden && String(hideRow?.hidden_by) === String(userId),
              messagingAllowed: status === "accepted" && !isHidden,
            });
          })
          .catch(() =>
            res.status(200).json({
              message: "Connection found",
              connection: connection,
              connectionStatus: status,
              relationship: relationship,
              messagingAllowed: status === "accepted",
            })
          );
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

// To accept/reject connection and insert question entry when accepted
const actionConnection = async (req, res) => {
  const { connectionId } = req.params;
  const { action } = req.body; // either 'accept' or 'reject'
  // Bind actor to JWT — ignore client-supplied userId
  const userId = req.user?.id;

  if (!action || !userId) {
    return res.status(400).json({ message: "Action required and must be authenticated" });
  }

  if (action !== "accept" && action !== "reject") {
    return res
      .status(400)
      .json({ error: 'Invalid action. Must be "accept" or "reject"' });
  }

  try {
    // First, get the connection details
    let sql = `SELECT * FROM connections WHERE id = ?`;
    mysqlcon.query(sql, [connectionId], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const connection = result[0];

      // Check if the user has permission to act on this connection
      // User must be the receiver to accept/reject a pending request
      if (connection.receiver_id != userId) {
        return res.status(403).json({
          error:
            "You do not have permission to perform this action. Only the receiver can accept/reject connection requests.",
        });
      }

      if (connection.status !== "pending") {
        return res.status(400).json({
          error: "Connection request has already been processed",
          currentStatus: connection.status,
        });
      }

      // Fetch user names for both sender and receiver
      const getUserNamesSql = `
                SELECT 
                    sender.id as sender_id,
                    sender.first_name as sender_first_name,
                    sender.last_name as sender_last_name,
                    receiver.id as receiver_id,
                    receiver.first_name as receiver_first_name,
                    receiver.last_name as receiver_last_name
                FROM connections c
                INNER JOIN users sender ON c.sender_id = sender.id
                INNER JOIN users receiver ON c.receiver_id = receiver.id
                WHERE c.id = ?
            `;

      mysqlcon.query(
        getUserNamesSql,
        [connectionId],
        (nameErr, nameResults) => {
          if (nameErr) {
            console.error("Error fetching user names:", nameErr);
            // Fallback to using IDs if name fetch fails
            return proceedWithAction(connection, null, null);
          }

          if (nameResults.length === 0) {
            console.warn("User names not found, using IDs instead");
            return proceedWithAction(connection, null, null);
          }

          const userNames = nameResults[0];
          const senderName = `${userNames.sender_first_name} ${userNames.sender_last_name}`;
          const receiverName = `${userNames.receiver_first_name} ${userNames.receiver_last_name}`;

          proceedWithAction(connection, senderName, receiverName);
        }
      );

      function proceedWithAction(connection, senderName, receiverName) {
        // Use names if available, otherwise use IDs
        const senderDisplay = senderName || `User ${connection.sender_id}`;
        const receiverDisplay =
          receiverName || `User ${connection.receiver_id}`;

        // Perform the action
        if (action === "accept") {
          // Update the connection status to accepted
          mysqlcon.query(
            `UPDATE connections SET status = 'accepted', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [connectionId],
            (err) => {
              if (err) {
                console.log(err);
                return res
                  .status(500)
                  .json({ message: "Internal Server Error" });
              }

              // LinkedIn-style Wall + notify/email both parties
              try {
                const {
                  announceConnection,
                } = require("../service/wallActivity.service");
                announceConnection(
                  connection.sender_id,
                  connection.receiver_id
                ).catch((questionErr) => {
                  console.error(
                    "Error inserting connection wall post:",
                    questionErr
                  );
                });
              } catch (questionErr) {
                console.error("Error inserting question:", questionErr);
              }

              try {
                const {
                  notifyConnectionAccepted,
                } = require("../service/connectionNotify.service");
                notifyConnectionAccepted(
                  connection.sender_id,
                  connection.receiver_id,
                  connectionId
                ).catch(() => {});
              } catch (_) { /* ignore */ }

              return res.status(200).json({
                message: "Connection request has been accepted successfully",
                connectionId: connectionId,
                questionTitle: `${senderDisplay} & ${receiverDisplay} are connected now`,
              });
            }
          );
        } else if (action === "reject") {
          // Update the connection status to rejected
          mysqlcon.query(
            `UPDATE connections SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [connectionId],
            (err) => {
              if (err) {
                console.log(err);
                return res
                  .status(500)
                  .json({ message: "Internal Server Error" });
              }

              return res.status(200).json({
                message: "Connection request has been rejected successfully",
                connectionId: connectionId,
              });
            }
          );
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to check and handle all connection scenarios
const handleConnectionRequest = async (req, res) => {
  const senderId = req.user?.id;
  const { receiverId, action } = req.body; // action: 'send', 'check', 'cancel'

  if (!senderId || !receiverId) {
    return res
      .status(400)
      .json({ message: "receiverId is required" });
  }

  if (String(senderId) === String(receiverId)) {
    return res
      .status(400)
      .json({ message: "Cannot send connection request to yourself" });
  }

  try {
    // Check existing connection
    mysqlcon.query(
      "SELECT * FROM connections WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
      [senderId, receiverId, receiverId, senderId],
      (error, existingConnections) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Internal server error" });
        }

        if (existingConnections.length > 0) {
          const connection = existingConnections[0];

          switch (connection.status) {
            case "accepted":
              return res.status(200).json({
                message: "Already connected",
                status: "accepted",
                connectionId: connection.id,
              });

            case "pending":
              // Determine who sent the request
              if (connection.sender_id == senderId) {
                return res.status(200).json({
                  message: "Request already sent by you",
                  status: "pending_sent",
                  connectionId: connection.id,
                });
              } else {
                return res.status(200).json({
                  message: "Request received from this user",
                  status: "pending_received",
                  connectionId: connection.id,
                });
              }

            case "rejected":
              return res.status(200).json({
                message: "Previous request was rejected",
                status: "rejected",
                connectionId: connection.id,
              });
          }
        }

        // If no existing connection and action is 'send', create new request
        if (action === "send") {
          mysqlcon.query(
            "INSERT INTO connections (sender_id, receiver_id) VALUES (?, ?)",
            [senderId, receiverId],
            (insertError, insertResult) => {
              if (insertError) {
                console.error(insertError);
                return res
                  .status(500)
                  .json({ message: "Internal server error" });
              }

              return res.status(200).json({
                message: "Connection request sent successfully",
                status: "new_request",
                connectionId: insertResult.insertId,
              });
            }
          );
        } else {
          return res.status(200).json({
            message: "No existing connection",
            status: "none",
          });
        }
      }
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** Withdraw pending request or remove an accepted connection (either party). */
const withdrawConnection = async (req, res) => {
  const connectionId = req.params.connectionId;
  const userId = req.user?.id;

  if (!connectionId || !userId) {
    return res.status(400).json({ message: "connectionId required" });
  }

  try {
    const [rows] = await mysqlcon.promise().query(
      `SELECT id, sender_id, receiver_id, status FROM connections WHERE id = ? LIMIT 1`,
      [connectionId]
    );
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ message: "Connection not found" });
    }
    if (
      String(row.sender_id) !== String(userId) &&
      String(row.receiver_id) !== String(userId)
    ) {
      return res.status(403).json({ message: "Not allowed to withdraw this connection" });
    }

    await mysqlcon.promise().query(`DELETE FROM connections WHERE id = ?`, [connectionId]);
    return res.status(200).json({
      message:
        row.status === "pending"
          ? "Connection request withdrawn"
          : "Connection removed",
      connectionId: Number(connectionId),
    });
  } catch (error) {
    console.error("withdrawConnection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** Hide an accepted connection — only a party to the connection. */
const hideConnection = async (req, res) => {
  const connectionId = req.params.connectionId;
  const userId = req.user?.id;
  if (!connectionId || !userId) {
    return res.status(400).json({ message: "connectionId required" });
  }
  try {
    await ensureConnectionPrivacyTables();
    const [rows] = await mysqlcon.promise().query(
      `SELECT id, sender_id, receiver_id, status FROM connections WHERE id = ? LIMIT 1`,
      [connectionId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ message: "Connection not found" });
    if (
      String(row.sender_id) !== String(userId) &&
      String(row.receiver_id) !== String(userId)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (row.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted connections can be hidden" });
    }
    const [existing] = await mysqlcon.promise().query(
      `SELECT hidden_by FROM connection_hides WHERE connection_id = ? LIMIT 1`,
      [connectionId]
    );
    if (existing.length) {
      return res.status(200).json({
        message: "Connection already hidden",
        hiddenBy: existing[0].hidden_by,
        canUnhide: String(existing[0].hidden_by) === String(userId),
      });
    }
    await mysqlcon.promise().query(
      `INSERT INTO connection_hides (connection_id, hidden_by) VALUES (?, ?)`,
      [connectionId, userId]
    );
    return res.status(200).json({
      message: "Connection hidden",
      connectionId: Number(connectionId),
      hiddenBy: userId,
      canUnhide: true,
    });
  } catch (error) {
    console.error("hideConnection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** Unhide — only the member who hid can unhide. */
const unhideConnection = async (req, res) => {
  const connectionId = req.params.connectionId;
  const userId = req.user?.id;
  if (!connectionId || !userId) {
    return res.status(400).json({ message: "connectionId required" });
  }
  try {
    await ensureConnectionPrivacyTables();
    const [existing] = await mysqlcon.promise().query(
      `SELECT hidden_by FROM connection_hides WHERE connection_id = ? LIMIT 1`,
      [connectionId]
    );
    if (!existing.length) {
      return res.status(404).json({ message: "Connection is not hidden" });
    }
    if (String(existing[0].hidden_by) !== String(userId)) {
      return res.status(403).json({
        message: "Only the member who hid this connection can unhide it",
      });
    }
    await mysqlcon.promise().query(
      `DELETE FROM connection_hides WHERE connection_id = ?`,
      [connectionId]
    );
    return res.status(200).json({
      message: "Connection unhidden",
      connectionId: Number(connectionId),
    });
  } catch (error) {
    console.error("unhideConnection:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** Admin: block a user from receiving/sending connection requests after abuse. */
const adminBlockConnectionUser = async (req, res) => {
  const userId = req.params.userId || req.body?.userId;
  const adminId = req.user?.id;
  const reason = req.body?.reason || "Abuse report";
  if (!userId) {
    return res.status(400).json({ message: "userId required" });
  }
  try {
    await ensureConnectionPrivacyTables();
    await mysqlcon.promise().query(
      `INSERT INTO connection_blocks (user_id, blocked_by_admin, reason)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         blocked_by_admin = VALUES(blocked_by_admin),
         reason = VALUES(reason),
         createdAt = CURRENT_TIMESTAMP`,
      [userId, adminId || null, reason]
    );
    return res.status(200).json({ message: "User blocked from connections", userId });
  } catch (error) {
    console.error("adminBlockConnectionUser:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const adminUnblockConnectionUser = async (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).json({ message: "userId required" });
  }
  try {
    await ensureConnectionPrivacyTables();
    await mysqlcon.promise().query(
      `DELETE FROM connection_blocks WHERE user_id = ?`,
      [userId]
    );
    return res.status(200).json({ message: "Connection block removed", userId });
  } catch (error) {
    console.error("adminUnblockConnectionUser:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  sendConnectionRequest,
  pendingRequestsSent,
  pendingRequestsReceived,
  getConnections,
  actionConnection,
  checkConnectionStatus,
  handleConnectionRequest,
  withdrawConnection,
  hideConnection,
  unhideConnection,
  adminBlockConnectionUser,
  adminUnblockConnectionUser,
};
