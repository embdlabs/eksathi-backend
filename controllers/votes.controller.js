// const { mysqlcon } = require("../model/db");
// const { getUserIDByEmail } = require("../service/utilities.service");

// const postVote = async (req, res) => {
//     const { questionId, answerId, email, voteType } = req.body;

//     if (!email || !voteType) {
//         return res.status(400).json({ message: "UserID/Email or Vote Type is missing" });
//     }
    
//     try {
//         if (questionId || answerId) {
//             console.log({email});
//             const userId = await getUserIDByEmail(email);
//             console.log("User ID: ", userId);
//             mysqlcon.query(`SELECT * from votes WHERE user_id=${userId} AND ${questionId ? `question_id=${questionId}` : `answer_id=${answerId}`}`,
//                 (err, votes) => {
//                     if (err) {
//                         console.error('Error selecting vote into database: ' + err.stack);
//                         res.status(500).send('Internal server error');
//                         return;
//                     }
//                     console.log("Vote Existed: ", votes);
//                     if (votes.length) {
//                         // Updating the existing vote into the votes table
//                         const updateVoteQuery = `UPDATE votes SET vote_type='${voteType}' WHERE user_id=${userId} AND ${questionId ? `question_id=${questionId}` : `answer_id=${answerId}`}`;
//                         mysqlcon.query(updateVoteQuery, (err, result) => {
//                             if (err) {
//                                 console.error('Error updating vote into database: ' + err.stack);
//                                 res.status(500).send('Internal server error');
//                                 return;
//                             }

//                             const newVoteId = result.insertId;
//                             res.status(200).json({
//                                 id: newVoteId,
//                                 message: "Vote Submitted"
//                             });
//                         });
//                     } else {
//                         // Insert the new vote into the votes table
//                         const insertVoteQuery = `INSERT INTO votes (question_id, answer_id, user_id, vote_type, createdAt) VALUES (?, ?, ?, ?, NOW())`;
//                         mysqlcon.query(insertVoteQuery, [questionId, answerId, userId, voteType], (err, result) => {
//                             if (err) {
//                                 console.error('Error inserting vote into database: ' + err.stack);
//                                 res.status(500).send('Internal server error');
//                                 return;
//                             }

//                             const newVoteId = result.insertId;
//                             res.status(201).json({
//                                 id: newVoteId,
//                                 message: "Vote Submitted"
//                             });
//                         });
//                     }
//                 }
//             );

//         } else {
//             return res.status(400).json({ message: "Must provide either question id or answer id" });
//         }
//     } catch (error) {
//         console.log(error);
//         res.status(400).json({ message: "Something went wrong" });
//     }
// }


// // API endpoint to get vote counts for a question or answer
// const getVotes = async (req, res) => {
//     const id = req.params.id;
//     const type = req.query.type || 'question';

//     // Check if the vote type is valid
//     if (type !== 'question' && type !== 'answer') {
//         return res.status(400).json({ error: 'Invalid vote type' });
//     }

//     try {
//         // Build the SQL query to get the vote counts
//         const query = `
//                         SELECT
//                         SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) AS upvotes,
//                         SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) AS downvotes
//                         FROM votes
//                         WHERE ${type}_id = ?;
//                     `;

//         // Execute the query
//         mysqlcon.query(query, [id], (err, result) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).json({ error: 'Internal server error' });
//             }

//             // If no votes found, return 0 counts for both upvotes and downvotes
//             if (result.length === 0) {
//                 return res.json({ upvotes: 0, downvotes: 0 });
//             }

//             // Return the vote counts
//             const voteCounts = result[0];
//             res.json(voteCounts);
//         });
//     } catch (err) {
//         console.log(err);
//         return res.status(409).json({ message: 'Something went wrong' });
//     }
// };


// module.exports = {
//     postVote,
//     getVotes
// }



const { mysqlcon } = require("../model/db");
const { getUserIDByEmail } = require("../service/utilities.service");
const { announcePostLiked } = require("../service/wallActivity.service");

/** Fire-and-forget LinkedIn-style wall blurb when someone upvotes a question. */
const maybeAnnounceLike = (userId, questionId, voteType) => {
  if (!questionId || voteType !== "upvote") return;
  announcePostLiked(userId, questionId).catch((e) =>
    console.error("announcePostLiked:", e?.message || e)
  );
};

/** Push live like counts so Home + Wall stay in sync. */
const broadcastVoteCounts = async (questionId) => {
  if (!questionId) return;
  try {
    const { getIO } = require("../socket");
    const io = typeof getIO === "function" ? getIO() : null;
    if (!io) return;
    const [rows] = await mysqlcon.promise().query(
      `SELECT
         SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) AS upvotes,
         SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) AS downvotes
       FROM votes WHERE question_id = ?`,
      [questionId]
    );
    io.emit("VOTE_UPDATED", {
      questionId: Number(questionId),
      upvotes: Number(rows[0]?.upvotes) || 0,
      downvotes: Number(rows[0]?.downvotes) || 0,
    });
  } catch (e) {
    console.error("broadcastVoteCounts:", e?.message || e);
  }
};

/** Persist vote notification so the owner sees it in the bell (not only realtime). */
const notifyVoteOwner = async (voterId, questionId, answerId, voteType) => {
  try {
    let ownerId = null;
    const contentId = questionId || answerId;
    if (questionId) {
      const [rows] = await mysqlcon
        .promise()
        .query(`SELECT user_id FROM questions WHERE id = ? LIMIT 1`, [questionId]);
      ownerId = rows[0]?.user_id;
    } else if (answerId) {
      const [rows] = await mysqlcon
        .promise()
        .query(`SELECT user_id FROM answers WHERE id = ? LIMIT 1`, [answerId]);
      ownerId = rows[0]?.user_id;
    }
    if (!ownerId || String(ownerId) === String(voterId)) return;

    const [voterRows] = await mysqlcon
      .promise()
      .query(`SELECT first_name FROM users WHERE id = ? LIMIT 1`, [voterId]);
    const name = voterRows[0]?.first_name || "Someone";
    const notificationType = voteType === "upvote" ? 7 : 8;
    const target = questionId ? "post" : "answer";
    const message = `${name} ${
      voteType === "upvote" ? "upvoted" : "downvoted"
    } your ${target}`;

    await mysqlcon.promise().query(
      `INSERT INTO notifications
        (sender_user_id, receiver_user_id, notification_type, content_id, message)
       VALUES (?, ?, ?, ?, ?)`,
      [voterId, ownerId, notificationType, contentId, message]
    );
  } catch (e) {
    console.error("vote notify:", e?.message || e);
  }
};

const ALLOWED_VOTE_TYPES = new Set(["upvote", "downvote"]);

const postVote = async (req, res) => {
    const { questionId, answerId, voteType } = req.body;
    const email = req.body?.email || req.user?.email;

    if ((!email && !req.user?.id) || !voteType) {
        return res.status(400).json({ message: "UserID/Email or Vote Type is missing" });
    }

    if (!ALLOWED_VOTE_TYPES.has(String(voteType))) {
        return res.status(400).json({ message: "Invalid vote type" });
    }
    
    try {
        if (questionId || answerId) {
            const userId = req.user?.id
              ? req.user.id
              : await getUserIDByEmail(email);

            // Block self-votes on own question/answer
            // Exception: connection announcements — either party may react
            try {
                if (questionId) {
                    const [rows] = await mysqlcon.promise().query(
                        `SELECT user_id, notification FROM questions WHERE id = ? LIMIT 1`,
                        [questionId]
                    );
                    const isConnectionWall =
                      String(rows[0]?.notification || "") === "connection_established";
                    if (
                      rows[0] &&
                      String(rows[0].user_id) === String(userId) &&
                      !isConnectionWall
                    ) {
                        return res.status(403).json({
                            message: "You cannot vote on your own post",
                        });
                    }
                } else if (answerId) {
                    const [rows] = await mysqlcon.promise().query(
                        `SELECT user_id FROM answers WHERE id = ? LIMIT 1`,
                        [answerId]
                    );
                    if (rows[0] && String(rows[0].user_id) === String(userId)) {
                        return res.status(403).json({
                            message: "You cannot vote on your own answer",
                        });
                    }
                }
            } catch (ownErr) {
                console.error("Self-vote check failed:", ownErr?.message || ownErr);
            }
            
            // First check if user already has a vote
            const selectSql = questionId
              ? `SELECT * FROM votes WHERE user_id = ? AND question_id = ?`
              : `SELECT * FROM votes WHERE user_id = ? AND answer_id = ?`;
            const selectParams = questionId
              ? [userId, questionId]
              : [userId, answerId];

            mysqlcon.query(
                selectSql,
                selectParams,
                (err, votes) => {
                    if (err) {
                        console.error('Error selecting vote from database: ' + err.stack);
                        res.status(500).send('Internal server error');
                        return;
                    }
                    
                    if (votes.length > 0) {
                        const existingVote = votes[0];
                        
                        if (existingVote.vote_type === voteType) {
                            // User is clicking the same vote again - remove the vote
                            mysqlcon.query(
                              `DELETE FROM votes WHERE id = ?`,
                              [existingVote.id],
                              (err, result) => {
                                if (err) {
                                    console.error('Error deleting vote from database: ' + err.stack);
                                    res.status(500).send('Internal server error');
                                    return;
                                }
                                broadcastVoteCounts(questionId);
                                res.status(200).json({
                                    action: 'removed',
                                    voteType: voteType,
                                    message: "Vote removed successfully"
                                });
                            });
                        } else {
                            // User is switching vote type - update the existing vote
                            mysqlcon.query(
                              `UPDATE votes SET vote_type = ? WHERE id = ?`,
                              [voteType, existingVote.id],
                              (err, result) => {
                                if (err) {
                                    console.error('Error updating vote in database: ' + err.stack);
                                    res.status(500).send('Internal server error');
                                    return;
                                }
                                notifyVoteOwner(userId, questionId, answerId, voteType);
                                maybeAnnounceLike(userId, questionId, voteType);
                                broadcastVoteCounts(questionId);
                                res.status(200).json({
                                    action: 'updated',
                                    oldVoteType: existingVote.vote_type,
                                    newVoteType: voteType,
                                    message: "Vote updated successfully"
                                });
                            });
                        }
                    } else {
                        // User has no vote yet - insert new vote
                        // answer_id must be NULL (not undefined) when voting on a question
                        const insertQuery = `INSERT INTO votes (question_id, answer_id, user_id, vote_type, createdAt) VALUES (?, ?, ?, ?, NOW())`;
                        mysqlcon.query(
                            insertQuery, 
                            [questionId || null, answerId || null, userId, voteType], 
                            (err, result) => {
                                if (err) {
                                    console.error('Error inserting vote into database: ' + err.stack);
                                    res.status(500).send('Internal server error');
                                    return;
                                }
                                notifyVoteOwner(userId, questionId, answerId, voteType);
                                maybeAnnounceLike(userId, questionId, voteType);
                                broadcastVoteCounts(questionId);
                                res.status(201).json({
                                    action: 'created',
                                    id: result.insertId,
                                    voteType: voteType,
                                    message: "Vote submitted"
                                });
                            }
                        );
                    }
                }
            );
        } else {
            return res.status(400).json({ message: "Must provide either question id or answer id" });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
};

// Get user's specific vote for a question/answer
const getUserVote = async (req, res) => {
    const { id } = req.params;
    const { type, userId } = req.query;
    
    if (!type || !userId) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (type !== 'question' && type !== 'answer') {
        return res.status(400).json({ error: 'Invalid type. Must be "question" or "answer"' });
    }
    
    try {
        const query = `
            SELECT * FROM votes 
            WHERE ${type}_id = ? AND user_id = ?
            LIMIT 1
        `;
        
        mysqlcon.query(query, [id, userId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            if (result.length === 0) {
                return res.json({ vote: null });
            }
            
            res.json({ vote: result[0] });
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

// Get vote counts for a question or answer
const getVotes = async (req, res) => {
    const id = req.params.id;
    const type = req.query.type || 'question';

    if (type !== 'question' && type !== 'answer') {
        return res.status(400).json({ error: 'Invalid vote type' });
    }

    try {
        const query = `
            SELECT
            SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) AS downvotes
            FROM votes
            WHERE ${type}_id = ?;
        `;

        mysqlcon.query(query, [id], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            const voteCounts = result[0] || {};
            res.json({
                upvotes: Number(voteCounts.upvotes) || 0,
                downvotes: Number(voteCounts.downvotes) || 0,
            });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong' });
    }
};

module.exports = {
    postVote,
    getVotes,
    getUserVote
};