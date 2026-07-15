const { mysqlcon } = require("../../model/db");
const { getTotalVotes, findUser, findComments } = require("./utilities.service");

// Define a search endpoint that accepts a keyword parameter
const searchQuestion = (req, res) => {
    const keyword = req.query.keyword;
    const db = req.institute.database_name;

    try {
        // Query the database for questions containing the keyword
        mysqlcon.query(
            `SELECT * FROM ${db}.questions WHERE title LIKE ? OR body LIKE ?`,
            [`%${keyword}%`, `%${keyword}%`],
            async (error, results) => {
                if (error) {
                    res.status(500).json({ message: 'Internal server error' });
                } else if (results.length === 0) {
                    res.status(200).json({ message: 'No results found', result: [] });
                } else {
                    // Sort the results by relevance
                    const sortedResults = results.sort((a, b) => {
                        // Calculate the relevance score for each question
                        const scoreA = a.title.toLowerCase().split(keyword.toLowerCase()).length - 1;
                        const scoreB = b.title.toLowerCase().split(keyword.toLowerCase()).length - 1;
                        // Sort by descending order of relevance score
                        return scoreB - scoreA;
                    });

                    // Collecting Relative informations
                    for (var i = 0; i < sortedResults.length; i++) {
                        let voteCount = await getTotalVotes(db, sortedResults[i].id, 'question');
                        let user = await findUser(db, sortedResults[i].user_id);
                        let comments = await findComments(db, sortedResults[i].id, 'question');
                        sortedResults[i] = { ...sortedResults[i], votes: voteCount, auther: user, comments };
                    }

                    // Return the most relevant result
                    res.status(200).json({
                        message: "Results Found",
                        result: sortedResults
                    });
                }
            });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Something went wrong" });
    }
}

const queryQuestion = (req, res) => {
    // Get query parameters for sorting, filtering, and pagination
    const sort = req.query.sort || 'newest';
    const filter = req.query.filter || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const instituteId = req.institute.id;
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
        case 'top-questions':
            sql += `
            ORDER BY answer_count DESC, vote_count DESC
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

module.exports = {
    searchQuestion,
    queryQuestion
}