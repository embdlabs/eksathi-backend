const { default: slugify } = require("slugify");
const { mysqlcon } = require("../../model/db");
const { authenticateApiKey } = require("./auth.service");
const { getTotalVotes, findUser, findComments, checkUser, getUserIDByEmail } = require("./utilities.service");
const { uid } = require("uid");

const getQuestions = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    // const instituteId = req.headers['x-institute-id'];
    const instituteId = req.institute.id;

    const { database_name } = req.institute;

    if (!apiKey || !instituteId) {
        return res.status(400).json({ error: 'API key and institute ID are required' });
    }

    const isAuthenticated = await authenticateApiKey(apiKey, instituteId);

    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Invalid API key or institute ID' });
    }

    try {
        mysqlcon.query(`SELECT * FROM institutes WHERE id=${instituteId}`, async (err, dbName) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("DB Name: ", database_name);
            if (dbName.length) {
                if (dbName[0]?.database_name) {
                    let sql = `SELECT * FROM ${dbName[0]?.database_name}.questions`;
                    mysqlcon.query(sql, async (err, results) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                message: "Internal Server Error"
                            });
                        }
                        if (results.length) {
                            for (var i = 0; i < results.length; i++) {
                                let voteCount = await getTotalVotes(database_name, results[i].id, 'question');
                                let user = await findUser(database_name, results[i].user_id);
                                let comments = await findComments(database_name, results[i].id, 'question');
                                results[i] = { ...results[i], votes: voteCount, auther: user, comments };
                            }
                            return res.status(200).json({
                                success: 1,
                                message: "Question Fetched Successfully",
                                results
                            });
                        } else {
                            return res.status(200).json({
                                success: 1,
                                message: "No Questions Found",
                                results
                            });
                        }
                    })

                } else {
                    return res.status(409).json({ message: "Contact Admin" });
                }
            } else {
                return res.status(401).json({ message: "Unautherized Access, Institute not found" })
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
};

const getQuestionsByEmail = async (req, res) => {
    const { email } = req.query;
    const apiKey = req.headers['x-api-key'];
    // const instituteId = req.headers['x-institute-id'];
    const instituteId = req.institute.id;

    const { database_name } = req.institute;

    if (!apiKey || !instituteId) {
        return res.status(400).json({ error: 'API key and institute ID are required' });
    }

    if (!email) {
        return res.status(400).json({ error: 'Email ID is required' });
    }

    const isAuthenticated = await authenticateApiKey(apiKey, instituteId);

    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Invalid API key or institute ID' });
    }

    try {
        mysqlcon.query(`SELECT * FROM institutes WHERE id=${instituteId}`, async (err, dbName) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("DB Name: ", database_name);
            if (dbName.length) {
                if (dbName[0]?.database_name) {
                    const userId = await getUserIDByEmail(database_name, email);
                    let sql = `SELECT * FROM ${dbName[0]?.database_name}.questions WHERE user_id = '${userId}'`;
                    mysqlcon.query(sql, async (err, results) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                message: "Internal Server Error"
                            });
                        }
                        if (results.length) {
                            for (var i = 0; i < results.length; i++) {
                                let voteCount = await getTotalVotes(database_name, results[i].id, 'question');
                                let user = await findUser(database_name, results[i].user_id);
                                let comments = await findComments(database_name, results[i].id, 'question');
                                results[i] = { ...results[i], votes: voteCount, auther: user, comments };
                            }
                            return res.status(200).json({
                                success: 1,
                                message: "Question Fetched Successfully",
                                results
                            });
                        } else {
                            return res.status(200).json({
                                success: 1,
                                message: "No Questions Found",
                                results
                            });
                        }
                    })

                } else {
                    return res.status(409).json({ message: "Contact Admin" });
                }
            } else {
                return res.status(401).json({ message: "Unautherized Access, Institute not found" })
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
};

const getQuestionsByID = async (req, res) => {
    const id = req.params.id;
    const apiKey = req.headers['x-api-key'];
    // const instituteId = req.headers['x-institute-id'];
    const instituteId = req.institute.id;

    const { database_name } = req.institute;

    if (!apiKey || !instituteId) {
        return res.status(400).json({ error: 'API key and institute ID are required' });
    }

    if (!id) {
        return res.status(400).json({ error: 'Question ID is required' });
    }

    const isAuthenticated = await authenticateApiKey(apiKey, instituteId);

    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Invalid API key or institute ID' });
    }

    try {
        mysqlcon.query(`SELECT * FROM institutes WHERE id=${instituteId}`, async (err, dbName) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("DB Name: ", database_name);
            if (dbName.length) {
                if (dbName[0]?.database_name) {
                    // const userId = await getUserIDByEmail(database_name, email);
                    let sql = `SELECT * FROM ${dbName[0]?.database_name}.questions WHERE id = '${id}'`;
                    mysqlcon.query(sql, async (err, results) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                message: "Internal Server Error"
                            });
                        }
                        if (results.length) {
                            for (var i = 0; i < results.length; i++) {
                                let voteCount = await getTotalVotes(database_name, results[i].id, 'question');
                                let user = await findUser(database_name, results[i].user_id);
                                let comments = await findComments(database_name, results[i].id, 'question');
                                results[i] = { ...results[i], votes: voteCount, auther: user, comments };
                            }
                            return res.status(200).json({
                                success: 1,
                                message: "Question Fetched Successfully",
                                results: results[0]
                            });
                        } else {
                            return res.status(200).json({
                                success: 1,
                                message: "No Questions Found",
                                results
                            });
                        }
                    })

                } else {
                    return res.status(409).json({ message: "Contact Admin" });
                }
            } else {
                return res.status(401).json({ message: "Unautherized Access, Institute not found" })
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
};

const getQuestionsBySlug = async (req, res) => {
    const slug = req.params.slug;
    const apiKey = req.headers['x-api-key'];
    // const instituteId = req.headers['x-institute-id'];
    const instituteId = req.institute.id;

    const { database_name } = req.institute;

    if (!apiKey || !instituteId) {
        return res.status(400).json({ error: 'API key and institute ID are required' });
    }

    if (!slug) {
        return res.status(400).json({ error: 'Slug is required' });
    }

    const isAuthenticated = await authenticateApiKey(apiKey, instituteId);

    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Invalid API key or institute ID' });
    }

    try {
        mysqlcon.query(`SELECT * FROM institutes WHERE id=${instituteId}`, async (err, dbName) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("DB Name: ", database_name);
            if (dbName.length) {
                if (dbName[0]?.database_name) {
                    // const userId = await getUserIDByEmail(database_name, email);
                    let sql = `SELECT * FROM ${dbName[0]?.database_name}.questions WHERE slug = '${slug}'`;
                    mysqlcon.query(sql, async (err, results) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                message: "Internal Server Error"
                            });
                        }
                        if (results.length) {
                            for (var i = 0; i < results.length; i++) {
                                let voteCount = await getTotalVotes(database_name, results[i].id, 'question');
                                let user = await findUser(database_name, results[i].user_id);
                                let comments = await findComments(database_name, results[i].id, 'question');
                                results[i] = { ...results[i], votes: voteCount, auther: user, comments };
                            }
                            return res.status(200).json({
                                success: 1,
                                message: "Question Fetched Successfully",
                                results: results[0]
                            });
                        } else {
                            return res.status(200).json({
                                success: 1,
                                message: "No Questions Found",
                                results
                            });
                        }
                    })

                } else {
                    return res.status(409).json({ message: "Contact Admin" });
                }
            } else {
                return res.status(401).json({ message: "Unautherized Access, Institute not found" })
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Something went wrong" });
    }
};

// const getQuestionsByID = (req, res) => {
//     const id = req.params.id;
//     const db = req.institute.database_name;

//     try {
//         // Define the SQL query to select the question by its ID
//         const sql = `
//             SELECT 
//                 q.id, q.title, q.body, q.createdAt, q.updatedAt 
//                 COUNT(a.id) AS answer_count, 
//                 SUM(vote.value) AS vote_count
//             FROM ${db}.questions q 
//             LEFT JOIN ${db}.answers a ON q.id = a.question_id 
//             LEFT JOIN ${db}.votes vote ON q.id = vote.question_id 
//             WHERE q.id = ?
//             GROUP BY q.id
//             `;
//         // const sql = `
//         //        SELECT * FROM ${db}.questions WHERE id = ${id}
//         //     `;

//         // Execute the SQL query with the specified ID parameter
//         mysqlcon.query(sql, (err, results) => {
//             if (err) {
//                 console.error('Error executing SQL query:', err.stack);
//                 return res.status(500).json({ error: 'Internal Server Error' });
//             }

//             // If no results were found for the specified ID, return a 404 error
//             if (results.length === 0) {
//                 return res.status(404).json({ error: 'Question not found' });
//             }

//             // Otherwise, return the question as a JSON object
//             const question = results[0];
//             res.json(question);
//         });
//     } catch (err) {
//         console.log(err);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// }

const getQuestionsByCategories = (req, res) => {
    // Get query parameters for sorting, filtering, and pagination
    const sort = req.query.sort || 'newest';
    const filter = req.query.filter || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const instituteId = req.institute.id;
    const categoryId = req.query.categoryId;
    const db = req.institute.database_name;

    // Define the base SQL query for selecting questions
    let sql = `
     SELECT 
       q.id, q.title, q.body, q.user_id, q.slug, q.createdAt, 
       COUNT(a.id) AS answer_count, 
       SUM(vote.vote_type) AS vote_count
     FROM ${db}.questions q 
     LEFT JOIN ${db}.answers a ON q.id = a.question_id 
     LEFT JOIN ${db}.votes vote ON q.id = vote.question_id 
   `;

    // Add WHERE clause to category
    if (categoryId) {
        sql += ` 
        WHERE q.category_id = ${categoryId}
        `;
    }

    // Add AND conditions between category and filter clause 
    if (categoryId && filter === 'answered' || filter === 'unanswered') {
        sql += ` AND `;
    }

    if (categoryId) {
        // Add WHERE clause to filter questions by answered/unanswered
        if (filter === 'answered') {
            sql += `
        q.id IN (
         SELECT question_id FROM ${db}.answers GROUP BY question_id
       )
     `;
        } else if (filter === 'unanswered') {
            sql += `
        q.id NOT IN (
         SELECT question_id FROM ${db}.answers GROUP BY question_id
       )
     `;
        }
    } else {
        // Add WHERE clause to filter questions by answered/unanswered
        if (filter === 'answered') {
            sql += `
       WHERE q.id IN (
         SELECT question_id FROM ${db}.answers GROUP BY question_id
       )
     `;
        } else if (filter === 'unanswered') {
            sql += `
       WHERE q.id NOT IN (
         SELECT question_id FROM ${db}.answers GROUP BY question_id
       )
     `;
        }
    }



    // Add GROUP BY clause to group questions by their ID
    sql += `
     GROUP BY q.id
   `;

    // Add ORDER BY clause to sort questions
    switch (sort) {
        case 'unanswered':
            sql += `
         ORDER BY answer_count ASC, vote_count DESC
       `;
            break;
        case 'popular':
            sql += `
         ORDER BY vote_count DESC, answer_count DESC
       `;
            break;
        case 'highest-votes':
            sql += `
         ORDER BY vote_count DESC
       `;
            break;
        case 'most-frequent':
            sql += `
         ORDER BY COUNT(q.id) DESC
       `;
            break;
        case 'recent-activity':
            sql += `ORDER BY COALESCE(MAX(q.createdAt), 0), COALESCE(MAX(a.createdAt), 0), COALESCE(MAX(vote.createdAt), 0) DESC`;
            break;
        case 'newest':
        default:
            sql += `
         ORDER BY q.createdAt DESC
       `;
            break;
    }

    // Add LIMIT and OFFSET clauses for pagination
    sql += `
     LIMIT ?, ?
   `;

    try {
        // Execute the SQL query with the specified parameters
        // console.log('Query: ', sql);
        mysqlcon.query(sql, [offset, limit], async (err, results) => {
            if (err) {
                console.error('Error executing SQL query:', err.stack);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (results.length) {
                for (var i = 0; i < results.length; i++) {
                    let voteCount = await getTotalVotes(db, results[i].id, 'question');
                    let user = await findUser(db, results[i].user_id);
                    let comments = await findComments(db, results[i].id, 'question');
                    results[i] = { ...results[i], votes: voteCount, auther: user, comments };
                }
                return res.status(200).json({
                    success: 1,
                    message: "Question Fetched Successfully",
                    results
                });
            } else {
                return res.status(200).json({
                    success: 1,
                    message: "No Questions Found",
                    results
                });
            }
        });
    } catch (error) {
        console.error('Error executing SQL query:', error.stack);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}

const postQuestion = async (req, res) => {
    const instituteId = req.instituteId;
    const { database_name } = req.institute;
    const { email, title, body, categoryId } = req.body;

    if (!instituteId) {
        return res.status(498).json({ message: "Institute ID is missing" });
    }

    if (!email || !body || !title || !categoryId) {
        return res.status(400).json({ message: "Post details are missing" });
    }

    let slug = slugify(title.toLowerCase());

    try {
        mysqlcon.query(`SELECT COUNT(*) as count FROM ${database_name}.questions WHERE slug = '${slug}'`,
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: "Internal Server Error" });
                }
                if (result[0].count > 0) {
                    slug = slug + '-' + uid(5);
                }
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Something went wrong" });
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
                            const userId = await getUserIDByEmail(database_name, email);
                            if (userId) {

                                const isUserExists = await checkUser(result[0]?.database_name, userId);
                                if (isUserExists) {
                                    let sql = `INSERT INTO ${result[0].database_name}.questions(user_id, title, body, category_id, slug) values(?, ?, ?, ?, ?);`;
                                    let values = [userId, title, body, categoryId, slug];
                                    mysqlcon.query(sql, values, (err) => {
                                        if (err) {
                                            console.log(err);
                                            return res.status(500).json({
                                                message: "Internal Server Error"
                                            })
                                        }
                                        return res.status(200).json({
                                            success: 1,
                                            message: "Question Posted Successfully",
                                            slug
                                        });
                                    })
                                } else {
                                    return res.status(409).json({ message: "User doesn't exists, If already a registered user, Please Contact your admin immediately." });
                                }
                            } else {
                                return res.status(409).json({ message: "User doesn't exists, If already a registered user, Please Contact your admin immediately." });
                            }
                        } catch (error) {
                            console.log(error);
                            res.status(400).json({ message: "Something went wrong" });
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

const updateQuestion = async (req, res) => {
    const id = req.params.id;
    const db = req.institute.database_name;
    const { email, title, body } = req.body;

    try {
        // Check if the question exists
        const checkQuestionSql = `SELECT * FROM ${db}.questions WHERE id = ?`;
        mysqlcon.query(checkQuestionSql, [id], async (err, results) => {
            if (err) {
                console.error('Error executing SQL query:', err.stack);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Question not found' });
            }

            const question = results[0];

            const userId = await getUserIDByEmail(db, email).catch((err) => {
                console.log(err);
            });
            if (userId) {

                // Check if the user is authorized to edit the question
                if (userId !== question.user_id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }

                // Update the question in the database
                const updateQuestionSql = `UPDATE ${db}.questions SET title = ?, body = ? WHERE id = ?`;
                mysqlcon.query(updateQuestionSql, [title, body, id], (err, results) => {
                    if (err) {
                        console.error('Error executing SQL query:', err.stack);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    res.status(200).json({ message: 'Question updated successfully' });
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

const questionStats = async (req, res) => {
    const db = req.institute.database_name;
    try {
        let results = {};
        // Get count of new questions asked today
        mysqlcon.query(`SELECT COUNT(*) AS count FROM ${db}.questions WHERE DATE(createdAt) = CURDATE()`,
            (err, today) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: "Internal Server Error" });
                };
                results = { ...results, today: today[0].count };

                // Get count of total questions
                mysqlcon.query(`SELECT COUNT(*) AS count FROM ${db}.questions`,
                    (err, total) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).json({ message: "Internal Server Error" });
                        };
                        results = { ...results, total: total[0].count };

                        // Get count of unanswered questions
                        mysqlcon.query(`SELECT COUNT(id) AS count
                            FROM ${db}.questions
                            WHERE id NOT IN (
                            SELECT DISTINCT question_id
                            FROM ${db}.answers
                            );`,
                            (err, unanswered) => {
                                if (err) {
                                    console.log(err);
                                    return res.status(500).json({ message: "Internal Server Error" });
                                };
                                results = { ...results, unanswered: unanswered[0].count };

                                // Send response
                                return res.status(200).json({
                                    message: "Count fectched",
                                    results
                                });
                            });
                    });
            });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getQuestions,
    getQuestionsByEmail,
    getQuestionsByCategories,
    postQuestion,
    updateQuestion,
    getQuestionsByID,
    getQuestionsBySlug,
    questionStats
}
