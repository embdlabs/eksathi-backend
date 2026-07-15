const { mysqlcon } = require("../../model/db");
const { sendTextMessage } = require("../../service/sms");
const { findUser, getTotalVotes, findComments, getUserIDByEmail } = require("./utilities.service");



const postAnswer = async (req, res) => {
    const instituteId = req.instituteId;
    const db = req.institute.database_name;
    const { email, questionId, title, body } = req.body;

    if (!instituteId) {
        return res.status(498).json({ message: "Institute ID is missing" });
    }

    if (!email || !body || !questionId) {
        return res.status(400).json({ message: "Answer details are incomplete" });
    }

    try {
        mysqlcon.query(
            `SELECT * FROM institutes WHERE id=${instituteId}`,
            async (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: "Internal Server Error" });
                }
                if (result.length) {
                    if (result[0]?.database_name) {
                        try {
                            let userId = await getUserIDByEmail(db, email);
                        if (userId) {
                            let sql = `INSERT INTO ${result[0].database_name}.answers(user_id, question_id, body${title ? ', title' : ''}) values(?, ?, ?${title ? ', ?' : ''});`;
                            let values = [userId, questionId, body, title];
                            mysqlcon.query(sql, values, (err) => {
                                if (err) {
                                    console.log(err);
                                    return res.status(500).json({
                                        message: "Internal Server Error"
                                    })
                                }
                                // sendTextMessage(`User: ${userId}, answered your question, Question Id: ${questionId}.`);
                                return res.status(200).json({
                                    success: 1,
                                    message: "Answer Posted Successfully",
                                });
                            })
                        } else {
                            return res.status(409).json({ message: "User doesn't exists, If already a registered user, Please Contact your admin immediately." });
                        }
                        } catch (error) {
                            console.log(error);
                            return res.status(400).json({ message: "Something went wrong" });
                        }
                    } else {
                        return res.status(409).json({ message: "Contact Admin" });
                    }
                } else {
                    return res.status(401).json({ message: "Unautherized Access, Institute not found" })
                }
            }
        );
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const getAnswers = async (req, res) => {
    const { database_name } = req.institute;
    const { id } = req.query;


    if (!id) {
        return res.status(400).json({ message: "Question ID is required" });
    }

    try {
        if (database_name) {
            let sql = `SELECT * FROM ${database_name}.answers WHERE question_id=${id}`;
            mysqlcon.query(sql, async (err, results) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Internal Server Error"
                    })
                }
                if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                        let user = await findUser(database_name, results[i].user_id);
                        let votes = await getTotalVotes(database_name, results[i].id, 'answer');
                        let comments = await findComments(database_name, results[i].id, 'answer');
                        results[i] = { ...results[i], votes, auther: user, comments };
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
        } else {
            return res.status(409).json({ message: "Contact Admin" });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
}

const updateAnswer = async (req, res) => {
    const id = req.params.id;
    const db = req.institute.database_name;
    const { email, title, body } = req.body;

    try {
        // Check if the question exists
        const checkAnswerSql = `SELECT * FROM ${db}.answers WHERE id = ?`;
        mysqlcon.query(checkAnswerSql, [id], async (err, results) => {
            if (err) {
                console.error('Error executing SQL query:', err.stack);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Answer not found' });
            }

            const answer = results[0];

            const userId = await getUserIDByEmail(db, email).catch((err) => {
                console.log(err);
            });
            if (userId) {

                // Check if the user is authorized to edit the answer
                if (userId !== answer.user_id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }

                // Update the answer in the database
                const updateAnswerSql = `UPDATE ${db}.answers SET title = ?, body = ? WHERE id = ?`;
                mysqlcon.query(updateAnswerSql, [title, body, id], (err, results) => {
                    if (err) {
                        console.error('Error executing SQL query:', err.stack);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    res.status(200).json({ message: 'Answer updated successfully' });
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
    postAnswer,
    getAnswers,
    updateAnswer
}