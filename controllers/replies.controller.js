const { mysqlcon } = require("../model/db");
const { getUserIDByEmail } = require("../service/utilities.service");

const postReply = async (req, res) => {
    const { commentId, email, replyText } = req.body;

    if (!email || !replyText) {
        return res.status(400).json({ message: "Email or Reply Text is missing" });
    }

    try {
        if (commentId) {
            const userId = await getUserIDByEmail(email);
            console.log("User ID: ", userId);
            // Insert the new comment into the comments table
            const insertReplyQuery = `INSERT INTO replies (comment_id, user_id, reply) VALUES (?, ?, ?)`;
            mysqlcon.query(insertReplyQuery, [commentId, userId, replyText], (err, result) => {
                if (err) {
                    console.error('Error inserting comment into database: ' + err.stack);
                    res.status(500).send('Internal server error');
                    return;
                }

                const newReplyId = result.insertId;
                res.status(201).json({
                    id: newReplyId,
                    message: "Reply Submitted"
                });
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const postThreadReply = (req, res) => {
    const { replyId, userId, replyText } = req.body;

    if (!userId || !replyText) {
        return res.status(400).json({ message: "UserID or Reply Text is missing" });
    }

    try {
        if (replyId) {
            // Insert the new comment into the comments table
            const insertReplyQuery = `INSERT INTO replies (parent_id, user_id, reply, is_thread) VALUES (?, ?, ?, 'true')`;
            mysqlcon.query(insertReplyQuery, [replyId, userId, replyText], (err, result) => {
                if (err) {
                    console.error('Error inserting reply into database: ' + err.stack);
                    res.status(500).send('Internal server error');
                    return;
                }

                const newReplyId = result.insertId;
                res.status(201).json({
                    id: newReplyId,
                    message: "Reply Submitted"
                });
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getReply = (req, res) => {
    const { id } = req.query;   // Comment ID

    if (!id) {
        return res.status(400).json({ message: "Comment ID is required" });
    }

    try {
        let sql = `SELECT replies.*, 
            JSON_OBJECT(
                'id', users.id, 
                'username', users.username, 
                'email', users.email, 
                'first_name', COALESCE(users.first_name, ''),
                'last_name', COALESCE(users.last_name, ''),
                'role', COALESCE(users.role, '')
            ) as user
            FROM replies
            JOIN users ON replies.user_id = users.id
            WHERE replies.comment_id = ${id}`;
            
        mysqlcon.query(sql, async (err, replies) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Internal Server Error"
                });
            }

            if (replies && replies.length > 0) {
                try {
                    for (let i = 0; i < replies.length; i++) {
                        const userData = JSON.parse(replies[i].user);
                        // Combine first_name and last_name into a full name
                        const firstName = userData.first_name || '';
                        const lastName = userData.last_name || '';
                        userData.name = `${firstName} ${lastName}`.trim();
                        userData.profile_pic = userData.profile_pic || null;
                        
                        replies[i] = {
                            ...replies[i], 
                            author: userData
                        };
                    }
                    
                    res.status(200).json({
                        success: 1,
                        message: "Replies Found",
                        replies
                    });
                } catch (parseError) {
                    console.error("Error parsing user data:", parseError);
                    console.error("Problematic user data:", replies[0]?.user);
                    res.status(200).json({
                        success: 0,
                        message: "No Replies Found due to data format error"
                    });
                }
            } else {
                res.status(200).json({
                    success: 0,
                    message: "No Replies Found"
                });
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

module.exports = {
    postReply,
    getReply,
    postThreadReply
};





// const { mysqlcon } = require("../model/db");
// const { getUserIDByEmail } = require("../service/utilities.service");
// const { sendNotificationToAllUsers } = require("../service/notify");
// // Add notification function - make sure to import or define it properly


// const postReply = async (req, res) => {
//     const { commentId, email, replyText } = req.body;

//     if (!email || !replyText) {
//         return res.status(400).json({ message: "Email and Reply Text are required" });
//     }

//     if (!commentId) {
//         return res.status(400).json({ message: "Comment ID is required" });
//     }

//     try {
//         const userId = await getUserIDByEmail(email);
//         console.log("User ID: ", userId);
        
//         if (!userId) {
//             return res.status(404).json({ message: "User not found" });
//         }
        
//         // First get user details for notification
//         const getUserDetailsQuery = `SELECT first_name, last_name, role FROM users WHERE id = ?`;
        
//         mysqlcon.query(getUserDetailsQuery, [userId], (userErr, userResult) => {
//             if (userErr) {
//                 console.error('Error getting user details: ', userErr);
//                 return res.status(500).json({ message: "Error getting user details" });
//             }
            
//             if (userResult.length === 0) {
//                 return res.status(404).json({ message: "User not found" });
//             }
            
//             const user = userResult[0];
//             const sender_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
//             const sender_role = user.role || null;
            
//             // Insert the new reply into the replies table
//             const insertReplyQuery = `INSERT INTO replies (comment_id, user_id, reply) VALUES (?, ?, ?)`;
//             mysqlcon.query(insertReplyQuery, [commentId, userId, replyText], (err, result) => {
//                 if (err) {
//                     console.error('Error inserting reply into database: ' + err.stack);
//                     return res.status(500).send('Internal server error');
//                 }

//                 const newReplyId = result.insertId;
                
//                 // Get comment author info for notification
//                 const getCommentAuthorQuery = `SELECT user_id FROM comments WHERE id = ?`;
//                 mysqlcon.query(getCommentAuthorQuery, [commentId], (authorErr, authorResult) => {
//                     if (authorErr) {
//                         console.error('Error getting comment author: ', authorErr);
//                         // Still return success even if notification fails
//                         return res.status(201).json({
//                             id: newReplyId,
//                             message: "Reply Submitted"
//                         });
//                     }
                    
//                     if (authorResult.length > 0) {
//                         const commentAuthorId = authorResult[0].user_id;
                        
//                         // Send notification only if not replying to self
//                         if (commentAuthorId !== userId) {
//                             // Send notification
//                             if (sendNotificationToAllUsers && typeof sendNotificationToAllUsers === 'function') {
//                                 sendNotificationToAllUsers({
//                                     sender_id: userId,
//                                     sender_name: sender_name,
//                                     sender_role: sender_role,
//                                     notification_type: 3, // Type 3 for reply notification
//                                     content_id: commentId,
//                                     message: `${sender_name} replied to your comment.`,
//                                     exclude_user_ids: [userId].filter(id => id) // Exclude reply author
//                                 }).catch(notifyErr => {
//                                     console.error('Notification error:', notifyErr);
//                                 });
//                             }
//                         }
//                     }
                    
//                     res.status(201).json({
//                         id: newReplyId,
//                         message: "Reply Submitted"
//                     });
//                 });
//             });
//         });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: "Something went wrong" });
//     }
// }

// const postThreadReply = (req, res) => {
//     const { replyId, userId, replyText } = req.body;

//     if (!userId || !replyText || !replyId) {
//         return res.status(400).json({ message: "UserID, Reply ID and Reply Text are required" });
//     }

//     try {
//         // First get user details for notification
//         const getUserDetailsQuery = `SELECT first_name, last_name, role FROM users WHERE id = ?`;
        
//         mysqlcon.query(getUserDetailsQuery, [userId], (userErr, userResult) => {
//             if (userErr) {
//                 console.error('Error getting user details: ', userErr);
//                 return res.status(500).json({ message: "Error getting user details" });
//             }
            
//             if (userResult.length === 0) {
//                 return res.status(404).json({ message: "User not found" });
//             }
            
//             const user = userResult[0];
//             const sender_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
//             const sender_role = user.role || null;
            
//             // Insert the new thread reply
//             const insertReplyQuery = `INSERT INTO replies (parent_id, user_id, reply, is_thread) VALUES (?, ?, ?, 'true')`;
//             mysqlcon.query(insertReplyQuery, [replyId, userId, replyText], (err, result) => {
//                 if (err) {
//                     console.error('Error inserting reply into database: ' + err.stack);
//                     return res.status(500).send('Internal server error');
//                 }

//                 const newReplyId = result.insertId;
                
//                 // Get parent reply author info for notification
//                 const getParentReplyAuthorQuery = `SELECT user_id FROM replies WHERE id = ?`;
//                 mysqlcon.query(getParentReplyAuthorQuery, [replyId], (authorErr, authorResult) => {
//                     if (authorErr) {
//                         console.error('Error getting parent reply author: ', authorErr);
//                         // Still return success even if notification fails
//                         return res.status(201).json({
//                             id: newReplyId,
//                             message: "Reply Submitted"
//                         });
//                     }
                    
//                     if (authorResult.length > 0) {
//                         const parentAuthorId = authorResult[0].user_id;
                        
//                         // Send notification only if not replying to self
//                         if (parentAuthorId !== userId) {
//                             // Send notification
//                             if (sendNotificationToAllUsers && typeof sendNotificationToAllUsers === 'function') {
//                                 sendNotificationToAllUsers({
//                                     sender_id: userId,
//                                     sender_name: sender_name,
//                                     sender_role: sender_role,
//                                     notification_type: 3, // Type 3 for reply notification
//                                     content_id: replyId,
//                                     message: `${sender_name} replied to your thread comment.`,
//                                     exclude_user_ids: [userId].filter(id => id) // Exclude reply author
//                                 }).catch(notifyErr => {
//                                     console.error('Notification error:', notifyErr);
//                                 });
//                             }
//                         }
//                     }
                    
//                     res.status(201).json({
//                         id: newReplyId,
//                         message: "Reply Submitted"
//                     });
//                 });
//             });
//         });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: "Something went wrong" });
//     }
// }

// const getReply = (req, res) => {
//     const { id } = req.query;   // Comment ID

//     if (!id) {
//         return res.status(400).json({ message: "Comment ID is required" });
//     }

//     try {
//         // FIXED: Use parameterized query to prevent SQL injection
//         let sql = `SELECT replies.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.first_name, 'last_name', users.last_name, 'role', users.role) as user
//             FROM replies
//             JOIN users ON replies.user_id = users.id
//             WHERE replies.comment_id = ?`;
            
//         mysqlcon.query(sql, [id], async (err, replies) => {
//             if (err) {
//                 console.log(err);
//                 return res.status(500).json({
//                     message: "Internal Server Error"
//                 });
//             }

//             if (replies.length) {
//                 // Process each reply
//                 const processedReplies = replies.map(reply => {
//                     try {
//                         const userData = JSON.parse(reply.user);
//                         userData.full_name = `${userData.name || ''} ${userData.last_name || ''}`.trim();
//                         return {
//                             ...reply,
//                             author: userData  // Fixed typo from 'author' to 'author'
//                         };
//                     } catch (parseError) {
//                         console.error('Error parsing user data:', parseError);
//                         return {
//                             ...reply,
//                             author: null
//                         };
//                     }
//                 });
                
//                 res.status(200).json({
//                     success: 1,
//                     message: "Replies Found",
//                     replies: processedReplies
//                 });
//             } else {
//                 res.status(200).json({
//                     success: 0,
//                     message: "No Replies Found",
//                     replies: []
//                 });
//             }
//         });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: "Something went wrong" });
//     }
// }

// module.exports = {
//     postReply,
//     getReply,
//     postThreadReply
// };