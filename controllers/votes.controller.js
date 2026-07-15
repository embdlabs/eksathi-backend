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

const postVote = async (req, res) => {
    const { questionId, answerId, email, voteType } = req.body;

    if (!email || !voteType) {
        return res.status(400).json({ message: "UserID/Email or Vote Type is missing" });
    }
    
    try {
        if (questionId || answerId) {
            const userId = await getUserIDByEmail(email);
            
            // First check if user already has a vote
            mysqlcon.query(
                `SELECT * FROM votes WHERE user_id=${userId} AND ${questionId ? `question_id=${questionId}` : `answer_id=${answerId}`}`,
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
                            const deleteQuery = `DELETE FROM votes WHERE id=${existingVote.id}`;
                            mysqlcon.query(deleteQuery, (err, result) => {
                                if (err) {
                                    console.error('Error deleting vote from database: ' + err.stack);
                                    res.status(500).send('Internal server error');
                                    return;
                                }
                                
                                res.status(200).json({
                                    action: 'removed',
                                    voteType: voteType,
                                    message: "Vote removed successfully"
                                });
                            });
                        } else {
                            // User is switching vote type - update the existing vote
                            const updateQuery = `UPDATE votes SET vote_type='${voteType}' WHERE id=${existingVote.id}`;
                            mysqlcon.query(updateQuery, (err, result) => {
                                if (err) {
                                    console.error('Error updating vote in database: ' + err.stack);
                                    res.status(500).send('Internal server error');
                                    return;
                                }
                                
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
                        const insertQuery = `INSERT INTO votes (question_id, answer_id, user_id, vote_type, createdAt) VALUES (?, ?, ?, ?, NOW())`;
                        mysqlcon.query(
                            insertQuery, 
                            [questionId, answerId, userId, voteType], 
                            (err, result) => {
                                if (err) {
                                    console.error('Error inserting vote into database: ' + err.stack);
                                    res.status(500).send('Internal server error');
                                    return;
                                }
                                
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

            if (result.length === 0) {
                return res.json({ upvotes: 0, downvotes: 0 });
            }

            const voteCounts = result[0];
            res.json(voteCounts);
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