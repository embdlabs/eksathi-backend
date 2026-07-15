// const { mysqlcon } = require("../model/db");
// const { findComments, getUserIDByEmail } = require("../service/utilities.service");

// const postComment = async (req, res) => {
//     const { questionId, answerId, userId, commentText, email } = req.body;

//     console.log("answer id: ", answerId)

//     if (!email || !commentText) {
//         return res.status(400).json({ message: "Email or Comment Text is missing" });
//     }


//     try {
//         if (questionId || answerId) {
//             const userId = await getUserIDByEmail(email);
//             console.log("User ID: ", userId);
//             // Insert the new comment into the comments table
//             const insertCommentQuery = `INSERT INTO comments (question_id, answer_id, user_id, comment_text, createdAt) VALUES (?, ?, ?, ?, NOW())`;
//             mysqlcon.query(insertCommentQuery, [questionId, answerId, userId, commentText], (err, result) => {
//                 if (err) {
//                     console.error('Error inserting comment into database: ' + err.stack);
//                     res.status(500).send('Internal server error');
//                     return;
//                 }

//                 const newCommentId = result.insertId;
//                 res.status(201).json({
//                     id: newCommentId,
//                     message: "Comment Submitted"
//                 });
//             });
//         }
//     } catch (error) {
//         console.log(error);
//         res.status(400).json({ message: "Something went wrong" });
//     }
// }

// const getCommentsByQuestionID = async (req, res) => {
//     const { id } = req.query;   // question ID


//     if (!id) {
//         return res.status(400).json({ message: "Question ID is required" });
//     }

//     try {
//         let sql = `SELECT comments.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.name) as user
//         FROM comments
//         JOIN users ON comments.user_id = users.id
//         WHERE comments.question_id = ${id};            
//         `;
//         mysqlcon.query(sql, async (err, comments) => {
//             if (err) {
//                 console.log(err);
//                 return res.status(500).json({
//                     message: "Internal Server Error"
//                 })
//             }

//             for (let i = 0; i < comments.length; i++) {
//                 comments[i] = { ...comments[i], user: JSON.parse(comments[i].user) };
//             }


//             res.status(200).json({
//                 success: 1,
//                 message: "Comments Found",
//                 comments
//             })

//         })
//     } catch (error) {
//         console.log(error);
//         res.status(400).json({ message: "Something went wrong" });
//     }
// }

// const getCommentsByAnswerID = async (req, res) => {
//     const { id } = req.query;   // Answer ID


//     if (!id) {
//         return res.status(400).json({ message: "Answer ID is required" });
//     }

//     try {
//         let sql = `SELECT comments.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.name) as user
//             FROM comments
//             JOIN users ON comments.user_id = users.id
//             WHERE comments.answer_id = ${id};            
//             `;
//             mysqlcon.query(sql, async (err, comments) => {
//                 if (err) {
//                     console.log(err);
//                     return res.status(500).json({
//                         message: "Internal Server Error"
//                     })
//                 }

//                 if (comments.length) {
//                     for (let i = 0; i < comments.length; i++) {
//                         comments[i] = { ...comments[i], user: JSON.parse(comments[i].user) };
//                     }


//                     res.status(200).json({
//                         success: 1,
//                         message: "Comments Found",
//                         comments
//                     })
//                 } else {
//                     res.status(200).json({
//                         success: 0,
//                         message: "No Comments Found"
//                     })
//                 }

//             })
//     } catch (error) {
//         console.log(error);
//         res.status(400).json({ message: "Something went wrong" });
//     }
// }

// // const getCommentsByQuestionID = async (req, res) => {
// //
// //     const { id } = req.query;   // question ID


// //     if (!id) {
// //         return res.status(400).json({ message: "Question ID is required" });
// //     }

// //     try {
// //         if (database_name) {
// //             let sql = `SELECT * FROM comments 
// //             LEFT JOIN users
// //             ON users.id=comments.user_id
// //             WHERE comments.question_id=${id}`;
// //             mysqlcon.query(sql, (err, comments) => {
// //                 if (err) {
// //                     console.log(err);
// //                     return res.status(500).json({
// //                         message: "Internal Server Error"
// //                     })
// //                 }
// //                 if (comments.length) {
// //                     // Getting Users
// //                     // const data = []
// //                     // for (i = 0; i < comments.length; i++) {
// //                     //     let auther = comments[i].user_id;
// //                     //     let userQuery = `SELECT * FROM users WHERE id=${auther}`;
// //                     //     mysqlcon.query(userQuery, (err, user) => {
// //                     //         if (err) {
// //                     //             console.log(err);
// //                     //             res.status(500).json({
// //                     //                 message: "Internal Server Error"
// //                     //             })
// //                     //         } else {
// //                     //             data[i] = { ...comments[i], user };

// //                     //         }
// //                     //     });
// //                     // }
// //                     // if (comments.length === i) {
// //                     //     return res.status(200).json({
// //                     //         success: 1,
// //                     //         message: "Comments Fetched Successfully",
// //                     //         data
// //                     //     });
// //                     // }
// //                     console.log(comments);
// //                 } else {
// //                     return res.status(200).json({
// //                         success: 1,
// //                         message: "No Comments Found",
// //                     });
// //                 }


// //             })
// //         } else {
// //             return res.status(409).json({ message: "Contact Admin" });
// //         }
// //     } catch (error) {
// //         console.log(error);
// //         res.status(400).json({ message: "Something went wrong" });
// //     }
// // }

// const getComments = async (req, res) => {
//     const { id, type } = req.query;   // Answer ID/ Question ID and Type


//     if (!id || !type) {
//         return res.status(400).json({ message: "ID or Type is required" });
//     }

//     try {
//         const comments = await findComments(id, type);
//         return res.status(200).json({
//             message: "Comments Found",
//             comments: comments
//         });
//     } catch (error) {
//         console.log(error);
//         res.status(409).json({
//             message: "Something went wrong"
//         })
//     }
// }

// module.exports = {
//     postComment,
//     getCommentsByQuestionID,
//     getCommentsByAnswerID,
//     getComments
// }



const { mysqlcon } = require("../model/db");
const { findComments, getUserIDByEmail } = require("../service/utilities.service");
const { sendNotificationToAllUsers } = require("../service/notify"); // Import the function
const { io } = require("../socket");


const postComment = async (req, res) => {
    const { questionId, answerId, userId, commentText, email } = req.body;

    console.log("Req.body is ",req.body)

    console.log("answer id: ", answerId)

    if (!email || !commentText) {
        return res.status(400).json({ message: "Email or Comment Text is missing" });
    }

    try {
        if (questionId || answerId) {
            const userId = await getUserIDByEmail(email);
            console.log("User ID: ", userId);
            
            // Get user info for notification
            const [userInfo] = await mysqlcon.promise().query(
                `SELECT first_name, last_name, role FROM users WHERE id = ?`, 
                [userId]
            );
            
            const user_name = userInfo[0] ? 
                `${userInfo[0].first_name} ${userInfo[0].last_name}` : 
                'Anonymous User';
            const user_role = userInfo[0]?.role || 'user';
            
            // Determine content type and get content info
            let content_type = questionId ? 'question' : 'answer';
            let content_id = questionId || answerId;
            let content_title = '';
            let content_author_id = null;
            
            if (questionId) {
                const [questionInfo] = await mysqlcon.promise().query(
                    `SELECT title, user_id FROM questions WHERE id = ?`, 
                    [questionId]
                );
                content_title = questionInfo[0]?.title || 'Question';
                content_author_id = questionInfo[0]?.user_id;
            } else if (answerId) {
                const [answerInfo] = await mysqlcon.promise().query(
                    `SELECT title, user_id FROM answers WHERE id = ?`, 
                    [answerId]
                );
                content_title = answerInfo[0]?.title || 'Answer';
                content_author_id = answerInfo[0]?.user_id;
            }
            
            // Insert the new comment into the comments table
            const insertCommentQuery = `INSERT INTO comments (question_id, answer_id, user_id, comment_text, createdAt) VALUES (?, ?, ?, ?, NOW())`;
            mysqlcon.query(insertCommentQuery, [questionId, answerId, userId, commentText], async (err, result) => {
                if (err) {
                    console.error('Error inserting comment into database: ' + err.stack);
                    res.status(500).send('Internal server error');
                    return;
                }

                const newCommentId = result.insertId;
                
                // Send notification to all users about the new comment
                // try {
                //     const notification_type = 2; // 2 = Comment posted
                //     const message = `${user_name} commented on a ${content_type}: "${content_title}"`;
                    
                //     // Send notification to all users
                //     const notificationResult = await sendNotificationToAllUsers({
                //         sender_id: userId,
                //         sender_name: user_name,
                //         sender_role: user_role,
                //         notification_type: notification_type,
                //         content_id: content_id,
                //         message: message,
                //         exclude_user_ids: [userId, content_author_id].filter(id => id) // Exclude commenter and content author
                //     });
                    
                //     console.log("Comment notification result:", notificationResult);
                    
                //     // Send a specific notification to content author
                //     if (content_author_id && content_author_id !== userId) {
                //         try {
                //             const authorMessage = `${user_name} commented on your ${content_type}`;
                            
                //             const authorQuery = `
                //                 INSERT INTO notifications 
                //                 (sender_user_id, receiver_user_id, notification_type, content_id, message)
                //                 VALUES (?, ?, ?, ?, ?)
                //             `;
                //             await mysqlcon.promise().query(authorQuery, [
                //                 userId, 
                //                 content_author_id, 
                //                 notification_type, 
                //                 content_id, 
                //                 authorMessage
                //             ]);
                            
                //             console.log(`✅ Specific notification sent to content author ${content_author_id}`);
                //         } catch (authorError) {
                //             console.error("Error sending notification to content author:", authorError);
                //         }
                //     }
                    
                //     // Send real-time socket notification
                //     if (io) {
                //         const broadcastData = {
                //             id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                //             sender_id: userId,
                //             sender_name: user_name,
                //             type: notification_type,
                //             content_id: content_id,
                //             message: message,
                //             content_type: content_type,
                //             comment_text: commentText,
                //             is_broadcast: true,
                //             is_read: 0,
                //             receiver_id: 'all',
                //             createdAt: new Date().toISOString(),
                //             notification_type: notification_type,
                //             content_title: content_title
                //         };
                        
                //         // Emit to all connected clients
                //         io.emit("notification-to-all", broadcastData);
                //         io.emit("get-notification", broadcastData);
                        
                //         console.log(`📢 Real-time comment broadcast sent to all users`);
                //     }
                    
                // } catch (notificationError) {
                //     console.error("Error sending comment notification:", notificationError);
                //     // Don't fail the comment if notification fails
                // }
                
                res.status(201).json({
                    id: newCommentId,
                    message: "Comment Submitted and notification sent"
                });
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getCommentsByQuestionID = async (req, res) => {
    const { id } = req.query;   // question ID

    if (!id) {
        return res.status(400).json({ message: "Question ID is required" });
    }

    try {
        let sql = `SELECT comments.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.name) as user
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.question_id = ${id};            
        `;
        mysqlcon.query(sql, async (err, comments) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Internal Server Error"
                })
            }

            for (let i = 0; i < comments.length; i++) {
                comments[i] = { ...comments[i], user: JSON.parse(comments[i].user) };
            }

            res.status(200).json({
                success: 1,
                message: "Comments Found",
                comments
            })

        })
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getCommentsByAnswerID = async (req, res) => {
    const { id } = req.query;   // Answer ID

    if (!id) {
        return res.status(400).json({ message: "Answer ID is required" });
    }

    try {
        let sql = `SELECT comments.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.name) as user
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.answer_id = ${id};            
            `;
            mysqlcon.query(sql, async (err, comments) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Internal Server Error"
                    })
                }

                if (comments.length) {
                    for (let i = 0; i < comments.length; i++) {
                        comments[i] = { ...comments[i], user: JSON.parse(comments[i].user) };
                    }

                    res.status(200).json({
                        success: 1,
                        message: "Comments Found",
                        comments
                    })
                } else {
                    res.status(200).json({
                        success: 0,
                        message: "No Comments Found"
                    })
                }

            })
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getComments = async (req, res) => {
    const { id, type } = req.query;   // Answer ID/ Question ID and Type

    if (!id || !type) {
        return res.status(400).json({ message: "ID or Type is required" });
    }

    try {
        const comments = await findComments(id, type);
        return res.status(200).json({
            message: "Comments Found",
            comments: comments
        });
    } catch (error) {
        console.log(error);
        res.status(409).json({
            message: "Something went wrong"
        })
    }
}

module.exports = {
    postComment,
    getCommentsByQuestionID,
    getCommentsByAnswerID,
    getComments
}