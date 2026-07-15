const { mysqlcon } = require("../../model/db");
const { getUserIDByEmail } = require("./utilities.service");

const postVote = async (req, res) => {
    const { database_name } = req.institute;
    const { questionId, answerId, email, voteType } = req.body;

    if (!database_name) {
        return res.status(500).json({ message: "Something went wrong" });
    }

    if (!email || !voteType) {
        return res.status(400).json({ message: "UserID/Email or Vote Type is missing" });
    }


    try {
        if (questionId || answerId) {
            console.log({ database_name, email });
            const userId = await getUserIDByEmail(database_name, email);
            console.log("User ID: ", userId);
            mysqlcon.query(`SELECT * from ${database_name}.votes WHERE user_id=${userId} AND ${questionId ? `question_id=${questionId}` : `answer_id=${answerId}`}`,
                (err, votes) => {
                    if (err) {
                        console.error('Error selecting vote into database: ' + err.stack);
                        res.status(500).send('Internal server error');
                        return;
                    }
                    console.log("Vote Existed: ", votes);
                    if (votes.length) {
                        // Updating the existing vote into the votes table
                        const updateVoteQuery = `UPDATE ${database_name}.votes SET vote_type='${voteType}' WHERE user_id=${userId} AND ${questionId ? `question_id=${questionId}` : `answer_id=${answerId}`}`;
                        mysqlcon.query(updateVoteQuery, (err, result) => {
                            if (err) {
                                console.error('Error updating vote into database: ' + err.stack);
                                res.status(500).send('Internal server error');
                                return;
                            }

                            const newVoteId = result.insertId;
                            res.status(200).json({
                                id: newVoteId,
                                message: "Vote Submitted"
                            });
                        });
                    } else {
                        // Insert the new vote into the votes table
                        const insertVoteQuery = `INSERT INTO ${database_name}.votes (question_id, answer_id, user_id, vote_type, createdAt) VALUES (?, ?, ?, ?, NOW())`;
                        mysqlcon.query(insertVoteQuery, [questionId, answerId, userId, voteType], (err, result) => {
                            if (err) {
                                console.error('Error inserting vote into database: ' + err.stack);
                                res.status(500).send('Internal server error');
                                return;
                            }

                            const newVoteId = result.insertId;
                            res.status(201).json({
                                id: newVoteId,
                                message: "Vote Submitted"
                            });
                        });
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
}

// API endpoint to get vote counts for a question or answer
const getVotes = async (req, res) => {
    const db = req.institute.database_name;
    const id = req.params.id;
    const type = req.query.type || 'question';

    // Check if the vote type is valid
    if (type !== 'question' && type !== 'answer') {
        return res.status(400).json({ error: 'Invalid vote type' });
    }

    try {
        // Build the SQL query to get the vote counts
        const query = `
                        SELECT
                        SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) AS upvotes,
                        SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) AS downvotes
                        FROM ${db}.votes
                        WHERE ${type}_id = ?;
                    `;

        // Execute the query
        mysqlcon.query(query, [id], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            // If no votes found, return 0 counts for both upvotes and downvotes
            if (result.length === 0) {
                return res.json({ upvotes: 0, downvotes: 0 });
            }

            // Return the vote counts
            const voteCounts = result[0];
            res.json(voteCounts);
        });
    } catch (err) {
        console.log(err);
        return res.status(409).json({ message: 'Something went wrong' });
    }
};


module.exports = {
    postVote,
    getVotes
}