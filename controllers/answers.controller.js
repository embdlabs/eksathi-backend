
// NEW 


const { mysqlcon } = require("../model/db");
const { findUser, getTotalVotes, findComments, getUserIDByEmail } = require("../service/utilities.service");
const { sendNotificationToAllUsers } = require("../service/notify"); // Import the function
const { io } = require("../socket");


const postAnswer = async (req, res) => {
    const { email, questionId, title, body } = req.body;

    if (!email || !body || !questionId) {
        return res.status(400).json({ message: "Answer details are incomplete" });
    }
    try {
        let userId = await getUserIDByEmail(email);
        if (userId) {
            // Get user info for notification
            const [userInfo] = await mysqlcon.promise().query(
                `SELECT first_name, last_name, role FROM users WHERE id = ?`, 
                [userId]
            );
            
            const user_name = userInfo[0] ? 
                `${userInfo[0].first_name} ${userInfo[0].last_name}` : 
                'Anonymous User';
            const user_role = userInfo[0]?.role || 'user';
            
            // Get question info for notification
            const [questionInfo] = await mysqlcon.promise().query(
                `SELECT title, user_id FROM questions WHERE id = ?`, 
                [questionId]
            );
            
            const question_title = questionInfo[0]?.title || 'Question';
            const question_author_id = questionInfo[0]?.user_id;
            
            let sql = `INSERT INTO answers(user_id, question_id, body${title ? ', title' : ''}) values(?, ?, ?${title ? ', ?' : ''});`;
            let values = [userId, questionId, body, title];
            
            mysqlcon.query(sql, values, async (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Internal Server Error"
                    });
                }
                
                const answerId = result.insertId;
                
                // // Send notification to all users about the new answer
                // try {
                //     const notification_type = 3; // 3 = Answer posted
                //     const message = `${user_name} posted a new answer to: "${question_title}"`;
                    
                //     // Send notification to all users
                //     const notificationResult = await sendNotificationToAllUsers({
                //         sender_id: userId,
                //         sender_name: user_name,
                //         sender_role: user_role,
                //         notification_type: notification_type,
                //         content_id: answerId,
                //         message: message,
                //         exclude_user_ids: [userId, question_author_id].filter(id => id) // Exclude answer author and question author
                //     });
                    
                //     console.log("Answer notification result:", notificationResult);
                    
                //     // Send a specific notification to question author
                //     if (question_author_id && question_author_id !== userId) {
                //         try {
                //             const authorMessage = `${user_name} answered your question: "${question_title}"`;
                            
                //             const authorQuery = `
                //                 INSERT INTO notifications 
                //                 (sender_user_id, receiver_user_id, notification_type, content_id, message)
                //                 VALUES (?, ?, ?, ?, ?)
                //             `;
                //             await mysqlcon.promise().query(authorQuery, [
                //                 userId, 
                //                 question_author_id, 
                //                 notification_type, 
                //                 answerId, 
                //                 authorMessage
                //             ]);
                            
                //             console.log(`✅ Specific notification sent to question author ${question_author_id}`);
                //         } catch (authorError) {
                //             console.error("Error sending notification to question author:", authorError);
                //         }
                //     }
                    
                //     // Send real-time socket notification
                //     if (io) {
                        
                //         const broadcastData = {
                //             id: `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                //             sender_id: userId,
                //             sender_name: user_name,
                //             type: notification_type,
                //             content_id: answerId,
                //             message: message,
                //             content_type: 'answer',
                //             is_broadcast: true,
                //             is_read: 0,
                //             receiver_id: 'all',
                //             createdAt: new Date().toISOString(),
                //             notification_type: notification_type,
                //             question_title: question_title
                //         };
                        
                //         // Emit to all connected clients
                //         io.emit("notification-to-all", broadcastData);
                //         io.emit("get-notification", broadcastData);
                        
                //         console.log(`📢 Real-time answer broadcast sent to all users`);
                //     }
                    
                // } catch (notificationError) {
                //     console.error("Error sending answer notification:", notificationError);
                //     // Don't fail the answer if notification fails
                // }
                
                return res.status(200).json({
                    success: 1,
                    message: "Answer Posted Successfully",
                    answerId: answerId
                });
            });
        } else {
            return res.status(409).json({ message: "User doesn't exists, If already a registered user, Please Contact your admin immediately." });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Something went wrong" });
    }
}

const getAnswers = async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: "Question ID is required" });
    }

    try {
        let sql = `SELECT * FROM answers WHERE question_id=${id}`;
        mysqlcon.query(sql, async (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Internal Server Error"
                })
            }
            if (results.length) {
                for (let i = 0; i < results.length; i++) {
                    let user = await findUser(results[i].user_id);
                    let votes = await getTotalVotes(results[i].id, 'answer');
                    let comments = await findComments(results[i].id, 'answer');
                    results[i] = { ...results[i], votes, author: user, comments };
                }
                return res.status(200).json({
                    success: 1,
                    message: "Answer Fetched Successfully",
                    results
                });
            } else {
                return res.status(200).json({
                    success: 0,
                    message: "Answers Not Found",
                    results
                });
            }
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getAnswersById = async (req, res) => {
    const {id} = req.params;

    if (!id) {
        return res.status(400).json({ message: "Answer ID is required" });
    }

    try {
        let sql = `SELECT * FROM answers WHERE id=${id}`;
        mysqlcon.query(sql, async (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Internal Server Error"
                })
            }
            if (results.length) {
                for (let i = 0; i < results.length; i++) {
                    let user = await findUser(results[i].user_id);
                    let votes = await getTotalVotes(results[i].id, 'answer');
                    let comments = await findComments(results[i].id, 'answer');
                    results[i] = { ...results[i], votes, author: user, comments };
                }
                return res.status(200).json({
                    success: 1,
                    message: "Answer Fetched Successfully",
                    results: results[0]
                });
            } else {
                return res.status(200).json({
                    success: 0,
                    message: "Answers Not Found",
                    results: results
                });
            }
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const updateAnswer = async (req, res) => {
    const id = req.params.id;
    const { email, title, body } = req.body;

    try {
        // Check if the question exists
        const checkAnswerSql = `SELECT * FROM answers WHERE id = ?`;
        mysqlcon.query(checkAnswerSql, [id], async (err, results) => {
            if (err) {
                console.error('Error executing SQL query:', err.stack);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Answer not found' });
            }

            const answer = results[0];
            const userId = await getUserIDByEmail(email).catch((err) => {
                console.log(err);
            });
            
            if (userId) {
                // Check if the user is authorized to edit the answer
                if (userId !== answer.user_id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
                
                // Get user info for notification
                const [userInfo] = await mysqlcon.promise().query(
                    `SELECT first_name, last_name, role FROM users WHERE id = ?`, 
                    [userId]
                );
                
                const user_name = userInfo[0] ? 
                    `${userInfo[0].first_name} ${userInfo[0].last_name}` : 
                    'Anonymous User';
                const user_role = userInfo[0]?.role || 'user';
                
                // Get question info
                const [questionInfo] = await mysqlcon.promise().query(
                    `SELECT title, user_id FROM questions WHERE id = ?`, 
                    [answer.question_id]
                );
                
                const question_title = questionInfo[0]?.title || 'Question';
                const question_author_id = questionInfo[0]?.user_id;

                // Update the answer in the database
                const updateAnswerSql = `UPDATE answers SET title = ?, body = ? WHERE id = ?`;
                mysqlcon.query(updateAnswerSql, [title, body, id], async (err, updateResult) => {
                    if (err) {
                        console.error('Error executing SQL query:', err.stack);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    
                    // Send notification to all users about answer update
                    try {
                        const notification_type = 9; // 9 = Answer updated (you can define your own type)
                        const message = `${user_name} updated their answer to: "${question_title}"`;
                        
                        // Send notification to all users
                        const notificationResult = await sendNotificationToAllUsers({
                            sender_id: userId,
                            sender_name: user_name,
                            sender_role: user_role,
                            notification_type: notification_type,
                            content_id: id,
                            message: message,
                            exclude_user_ids: [userId].filter(id => id) // Exclude answer author
                        });
                        
                        console.log("Answer update notification result:", notificationResult);
                        
                        // Send a specific notification to question author
                        if (question_author_id && question_author_id !== userId) {
                            try {
                                const authorMessage = `${user_name} updated their answer to your question`;
                                
                                const authorQuery = `
                                    INSERT INTO notifications 
                                    (sender_user_id, receiver_user_id, notification_type, content_id, message)
                                    VALUES (?, ?, ?, ?, ?)
                                `;
                                await mysqlcon.promise().query(authorQuery, [
                                    userId, 
                                    question_author_id, 
                                    notification_type, 
                                    id, 
                                    authorMessage
                                ]);
                                
                                console.log(`✅ Update notification sent to question author ${question_author_id}`);
                            } catch (authorError) {
                                console.error("Error sending update notification to question author:", authorError);
                            }
                        }
                        
                        // Send real-time socket notification
                        if (io) {
                            const broadcastData = {
                                id: `answer-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                sender_id: userId,
                                sender_name: user_name,
                                type: notification_type,
                                content_id: id,
                                message: message,
                                content_type: 'answer',
                                is_broadcast: true,
                                is_read: 0,
                                receiver_id: 'all',
                                createdAt: new Date().toISOString(),
                                notification_type: notification_type,
                                question_title: question_title
                            };
                            
                            // Emit to all connected clients
                            io.emit("notification-to-all", broadcastData);
                            io.emit("get-notification", broadcastData);
                            
                            console.log(`📢 Real-time answer update broadcast sent to all users`);
                        }
                        
                    } catch (notificationError) {
                        console.error("Error sending answer update notification:", notificationError);
                        // Don't fail the update if notification fails
                    }
                    
                    res.status(200).json({ 
                        message: 'Answer updated successfully and notification sent'
                    });
                });
            } else {
                return res.status(404).json({ message: "User Not Found" });
            }
        });
    } catch (error) {
        console.error('Error executing SQL query:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const getTotalAnswer = async (req, res) => {
    const {userId} = req.params;

    if (!userId) {
        return res.status(400).json({ message: "userId is required" });
    }

    try { 
        mysqlcon.query(`SELECT DISTINCT * FROM answers WHERE user_id = ? ORDER BY createdAt DESC`,[userId], (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Internal Server Error"
                })
            }
            if (results.affectedRows === 0) {
                return res.status(401).json({ message: 'Answer not found or user is not the author' });
            }

            res.status(200).json({
                    success: 1,
                    message: "Answer Fetched Successfully",
                    answers: results
                });
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const answeredQuestions = async (req, res) => {
    const sort = req.query.sort || "newest";
    const filter = req.query.filter || "all";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(409).json({ message: "User Id is required" });
    }

    // Define the base SQL query
    let sql = `
    SELECT q.*
    FROM answers a
    INNER JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ?
    `;

    // Complete the SQL query with grouping, sorting, and pagination
    sql += `
      ORDER BY q.createdAt DESC LIMIT ? OFFSET ?
    `;
    try {
      mysqlcon.query(sql, [userId, limit, offset], async (err, results) => {
        if (err) {
          console.error("Error executing SQL query:", err.stack);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (results.length) {
          for (let i = 0; i < results.length; i++) {
            const voteCount = await getTotalVotes(results[i].id, "answer");
            const user = await findUser(results[i].user_id);
            const comments = await findComments(results[i].id, "answer");
            const tags = JSON.parse(results[i].tags) || [];
            results[i] = {
              ...results[i],
              votes: voteCount,
              author: user,
              comments,
              tags,
            };
          }
          return res.status(200).json({
            success: 1,
            message: "Answers Fetched Successfully",
            results,
          });
        } 
        else {
          return res.status(200).json({
            success: 1,
            message: "No Answers Found",
            results,
          });
        }
      });
    } catch (error) {
      console.error("Error executing SQL query:", error.stack);
      return res.status(500).json({ error: "Something went wrong" });
    }
  };

module.exports = {
    postAnswer,
    getAnswers,
    getAnswersById,
    updateAnswer,
    getTotalAnswer,
    answeredQuestions
}