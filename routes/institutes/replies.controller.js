const { mysqlcon } = require("../../model/db");
const { getUserIDByEmail } = require("./utilities.service");

const postReply = async (req, res) => {
    const { database_name } = req.institute;
    const { commentId, email, replyText } = req.body;

    if (!database_name) {
        return res.status(500).json({ message: "Something went wrong" });
    }

    if (!email || !replyText) {
        return res.status(400).json({ message: "Email or Reply Text is missing" });
    }


    try {
        if (commentId) {
            const userId = await getUserIDByEmail(database_name, email);
            console.log("User ID: ", userId);
            // Insert the new comment into the comments table
            const insertReplyQuery = `INSERT INTO ${database_name}.replies (comment_id, user_id, reply) VALUES (?, ?, ?)`;
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
    const { database_name } = req.institute;
    const { replyId, userId, replyText } = req.body;

    if (!database_name) {
        return res.status(500).json({ message: "Something went wrong" });
    }

    if (!userId || !replyText) {
        return res.status(400).json({ message: "UserID or Reply Text is missing" });
    }


    try {
        if (commentId || replyId) {
            // Insert the new comment into the comments table
            const insertReplyQuery = `INSERT INTO ${database_name}.replies (parent_id, comment_id, user_id, reply, is_thread) VALUES (?, ?, ?, ?, 'true')`;
            mysqlcon.query(insertReplyQuery, [replyId, commentId, userId, replyText], (err, result) => {
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
    const { database_name } = req.institute;
    const { id } = req.query;   // Comment ID


    if (!id) {
        return res.status(400).json({ message: "Comment ID is required" });
    }

    try {
        if (database_name) {
            let sql = `SELECT ${database_name}.replies.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.name) as user
            FROM ${database_name}.replies
            JOIN ${database_name}.users ON ${database_name}.replies.user_id = ${database_name}.users.id
            WHERE ${database_name}.replies.comment_id = ${id};            
            `;
            mysqlcon.query(sql, async (err, replies) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Internal Server Error"
                    })
                }

                if (replies.length) {
                    for (let i = 0; i < replies.length; i++) {
                        replies[i] = {...replies[i], auther: JSON.parse(replies[i].user)}; 
                    }
                    
    
                    res.status(200).json({
                        success: 1,
                        message: "Replies Found",
                        replies
                    })
                } else {
                    res.status(200).json({
                        success: 0,
                        message: "No Replies Found"
                    })
                }

            })
        } else {
            return res.status(409).json({ message: "Contact Admin" });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}


module.exports = {
    postReply,
    getReply,
    postThreadReply
}