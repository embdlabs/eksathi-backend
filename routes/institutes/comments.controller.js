const { mysqlcon } = require("../../model/db");
const { getUserIDByEmail, findComments } = require("./utilities.service");

const postComment = async (req, res) => {
    const { database_name } = req.institute;
    const { questionId, answerId, userId, commentText, email } = req.body;

    console.log("answer id: ", answerId)

    if (!database_name) {
        return res.status(500).json({ message: "Something went wrong" });
    }

    if (!email || !commentText) {
        return res.status(400).json({ message: "Email or Comment Text is missing" });
    }


    try {
        if (questionId || answerId) {
            const userId = await getUserIDByEmail(database_name, email);
            console.log("User ID: ", userId);
            // Insert the new comment into the comments table
            const insertCommentQuery = `INSERT INTO ${database_name}.comments (question_id, answer_id, user_id, comment_text, createdAt) VALUES (?, ?, ?, ?, NOW())`;
            mysqlcon.query(insertCommentQuery, [questionId, answerId, userId, commentText], (err, result) => {
                if (err) {
                    console.error('Error inserting comment into database: ' + err.stack);
                    res.status(500).send('Internal server error');
                    return;
                }

                const newCommentId = result.insertId;
                res.status(201).json({
                    id: newCommentId,
                    message: "Comment Submitted"
                });
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getCommentsByQuestionID = async (req, res) => {
    const { database_name } = req.institute;
    const { id } = req.query;   // question ID


    if (!id) {
        return res.status(400).json({ message: "Question ID is required" });
    }

    try {
        if (database_name) {
            let sql = `SELECT ${database_name}.comments.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.name) as user
            FROM ${database_name}.comments
            JOIN ${database_name}.users ON ${database_name}.comments.user_id = ${database_name}.users.id
            WHERE ${database_name}.comments.question_id = ${id};            
            `;
            mysqlcon.query(sql, async (err, comments) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Internal Server Error"
                    })
                }

                for (let i = 0; i < comments.length; i++) {
                    comments[i] = {...comments[i], auther: JSON.parse(comments[i].user)}; 
                }
                

                res.status(200).json({
                    success: 1,
                    message: "Comments Found",
                    comments
                })

            })
        } else {
            return res.status(409).json({ message: "Contact Admin" });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getCommentsByAnswerID = async (req, res) => {
    const { database_name } = req.institute;
    const { id } = req.query;   // Answer ID


    if (!id) {
        return res.status(400).json({ message: "Answer ID is required" });
    }

    try {
        if (database_name) {
            let sql = `SELECT ${database_name}.comments.*, JSON_OBJECT('id', users.id, 'username', users.username, 'email', users.email, 'name', users.name) as user
            FROM ${database_name}.comments
            JOIN ${database_name}.users ON ${database_name}.comments.user_id = ${database_name}.users.id
            WHERE ${database_name}.comments.answer_id = ${id};            
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
                        comments[i] = {...comments[i], user: JSON.parse(comments[i].user)}; 
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
        } else {
            return res.status(409).json({ message: "Contact Admin" });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

// const getCommentsByQuestionID = async (req, res) => {
//     const { database_name } = req.institute;
//     const { id } = req.query;   // question ID


//     if (!id) {
//         return res.status(400).json({ message: "Question ID is required" });
//     }

//     try {
//         if (database_name) {
//             let sql = `SELECT * FROM ${database_name}.comments 
//             LEFT JOIN ${database_name}.users
//             ON ${database_name}.users.id=${database_name}.comments.user_id
//             WHERE ${database_name}.comments.question_id=${id}`;
//             mysqlcon.query(sql, (err, comments) => {
//                 if (err) {
//                     console.log(err);
//                     return res.status(500).json({
//                         message: "Internal Server Error"
//                     })
//                 }
//                 if (comments.length) {
//                     // Getting Users
//                     // const data = []
//                     // for (i = 0; i < comments.length; i++) {
//                     //     let auther = comments[i].user_id;
//                     //     let userQuery = `SELECT * FROM ${database_name}.users WHERE id=${auther}`;
//                     //     mysqlcon.query(userQuery, (err, user) => {
//                     //         if (err) {
//                     //             console.log(err);
//                     //             res.status(500).json({
//                     //                 message: "Internal Server Error"
//                     //             })
//                     //         } else {
//                     //             data[i] = { ...comments[i], user };
                                
//                     //         }
//                     //     });
//                     // }
//                     // if (comments.length === i) {
//                     //     return res.status(200).json({
//                     //         success: 1,
//                     //         message: "Comments Fetched Successfully",
//                     //         data
//                     //     });
//                     // }
//                     console.log(comments);
//                 } else {
//                     return res.status(200).json({
//                         success: 1,
//                         message: "No Comments Found",
//                     });
//                 }


//             })
//         } else {
//             return res.status(409).json({ message: "Contact Admin" });
//         }
//     } catch (error) {
//         console.log(error);
//         res.status(400).json({ message: "Something went wrong" });
//     }
// }

const getComments = async (req, res) => {
    const db = req.institute.database_name;
    const { id, type } = req.query;   // Answer ID/ Question ID and Type


    if (!id || !type) {
        return res.status(400).json({ message: "ID or Type is required" });
    }

    if(!db) {
        return res.status(401).json({ message: "Access Denied" });
    }

    try {
        const comments = await findComments(db, id, type);
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

const updateComment = async (req, res) => {
    const id = req.params.id;
    const db = req.institute.database_name;
    const { email, commentText } = req.body;

    try {
        // Check if the comment exists
        const checkCommentSql = `SELECT * FROM ${db}.comments WHERE id = ?`;
        mysqlcon.query(checkCommentSql, [id], async (err, results) => {
            if (err) {
                console.error('Error executing SQL query:', err.stack);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            const comment = results[0];

            // Get the user id from the email address
            const userId = await getUserIDByEmail(db, email).catch((err) => {
                console.log(err);
            });
            if (userId) {

                // Check if the user is authorized to edit the comment
                if (userId !== comment.user_id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }

                // Update the comment in the database
                const updateCommentSql = `UPDATE ${db}.comments SET comment_text = ? WHERE id = ?`;
                mysqlcon.query(updateCommentSql, [commentText, id], (err, results) => {
                    if (err) {
                        console.error('Error executing SQL query:', err.stack);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    res.status(200).json({ message: 'Comment updated successfully' });
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

module.exports = {
    postComment,
    getCommentsByQuestionID,
    getCommentsByAnswerID,
    getComments,
    updateComment
}