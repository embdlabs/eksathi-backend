const { default: slugify } = require("slugify");
// const { authenticateApiKey } = require("./auth.service");
// const { getTotalVotes, findUser, findComments, checkUser, getUserIDByEmail } = require("./utilities.service");
const { mysqlcon } = require("../model/db");
const { uid } = require("uid");
const {
  getTotalVotes,
  findUser,
  findComments,
  getUserIDByEmail,
  extractKeywords,
} = require("../service/utilities.service");

// const getQuestions = async (req, res) => {
//   // Get query parameters for sorting, filtering, and pagination
//   const sort = req.query.sort || 'newest';
//   const filter = req.query.filter || 'all';
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const offset = (page - 1) * limit;
//   const db = process.env.DBNAME;

//   // Define the base SQL query for selecting questions
//   let sql = `
//      SELECT 
//        q.id, q.title, q.body, q.user_id, q.slug, q.tags, q.createdAt, c.name as category,
//        (SELECT COUNT(*) FROM questions) AS length,
//        COUNT(a.id) AS answer_count, 
//        SUM(vote.vote_type) AS vote_count
//      FROM questions q 
//      LEFT JOIN answers a ON q.id = a.question_id 
//      LEFT JOIN votes vote ON q.id = vote.question_id 
//      LEFT JOIN categories c ON q.category_id = c.id
//      WHERE q.is_hidden = 0
//    `;

//   // Add WHERE clause to filter questions by answered/unanswered
//   if (filter === "answered") {
//     sql += `
//        AND q.id IN (
//          SELECT question_id FROM answers GROUP BY question_id
//        )
//      `;
//   } else if (filter === "unanswered") {
//     sql += `
//        AND q.id NOT IN (
//          SELECT question_id FROM answers GROUP BY question_id
//        )
//      `;
//   }

//   // Add GROUP BY clause to group questions by their ID
//   sql += `
//      GROUP BY q.id
//    `;

//   // Add ORDER BY clause to sort questions
//   switch (sort) {
//     case "unanswered":
//       sql += `
//          ORDER BY answer_count ASC, vote_count DESC
//        `;
//       break;
//     case "popular":
//       sql += `
//          ORDER BY vote_count DESC, answer_count DESC
//        `;
//       break;
//     case "highest-votes":
//       sql += `
//          ORDER BY vote_count DESC
//        `;
//       break;
//     case "most-frequent":
//       sql += `
//          ORDER BY COUNT(q.id) DESC
//        `;
//       break;
//     case "recent-activity":
//       sql += `ORDER BY COALESCE(MAX(q.createdAt), 0), COALESCE(MAX(a.createdAt), 0), COALESCE(MAX(vote.createdAt), 0) DESC`;
//       break;
//     case "newest":
//     default:
//       // sql += `
//       //    ORDER BY q.createdAt DESC
//       //  `;
//       break;
//   }

//   sql += `
//          ORDER BY q.createdAt DESC
//        `;

//   // Add LIMIT and OFFSET clauses for pagination
//   sql += `
//      LIMIT ?, ?
//    `;

//   try {
//     // Execute the SQL query with the specified parameters
//     // console.log("Query: ", sql);
//     mysqlcon.query(sql, [offset, limit], async (err, results) => {
//       if (err) {
//         console.error("Error executing SQL query:", err.stack);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }
//       if (results.length) {
//         for (var i = 0; i < results.length; i++) {
//           let voteCount = await getTotalVotes(results[i].id, "question");
//           let user = await findUser(results[i].user_id);
//           let comments = await findComments(results[i].id, "question");
//           let tags = [];
//           try {
//             tags = JSON.parse(results[i].tags);
//           } catch (e) {
//             console.error("Error parsing tags for question ID:", results[i].id);
//           }
//           results[i] = {
//             ...results[i],
//             votes: voteCount,
//             auther: user,
//             comments,
//             tags,
//           };
//         }
//         return res.status(200).json({
//           success: 1,
//           message: "Questions Fetched Successfully",
//           results,
//         });
//       } else {
//         return res.status(200).json({
//           success: 1,
//           message: "No Questions Found",
//           results,
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Error executing SQL query:", error.stack);
//     return res.status(500).json({ error: "Something went wrong" });
//   }
// };

const getQuestions = async (req, res) => {
  try {
    const sort = req.query.sort || 'newest';
    const filter = req.query.filter || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const userId = req.query.userId || null;

    // Step 1: Get question IDs based on filters
    let questionIdsSql = `
      SELECT DISTINCT q.id
      FROM questions q
      WHERE q.is_hidden = 0
    `;
    
    let questionIdsParams = [];
    
    // Apply filters
    if (filter === "answered") {
      questionIdsSql += ` AND EXISTS (SELECT 1 FROM answers a WHERE a.question_id = q.id)`;
    } else if (filter === "unanswered") {
      questionIdsSql += ` AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.question_id = q.id)`;
    }
    
    if (sort === "my-questions" && userId) {
      questionIdsSql += ` AND q.user_id = ?`;
      questionIdsParams.push(userId);
    } else if (sort === "my-answers" && userId) {
      questionIdsSql += ` AND EXISTS (SELECT 1 FROM answers a WHERE a.question_id = q.id AND a.user_id = ?)`;
      questionIdsParams.push(userId);
    }
    
    // Get count
    const countSql = `SELECT COUNT(*) as total FROM (${questionIdsSql}) as temp`;
    
    // Add ORDER BY and LIMIT for pagination
    switch (sort) {
      case "newest":
        questionIdsSql += ` ORDER BY q.createdAt DESC`;
        break;
      case "unanswered":
        questionIdsSql += ` ORDER BY (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) ASC, q.createdAt DESC`;
        break;
      case "popular":
        questionIdsSql += ` ORDER BY 
          (SELECT COALESCE(SUM(vote_type), 0) FROM votes v WHERE v.question_id = q.id) DESC,
          (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) DESC,
          q.createdAt DESC`;
        break;
      case "highest-votes":
        questionIdsSql += ` ORDER BY (SELECT COALESCE(SUM(vote_type), 0) FROM votes v WHERE v.question_id = q.id) DESC, q.createdAt DESC`;
        break;
      default:
        questionIdsSql += ` ORDER BY q.createdAt DESC`;
    }
    
    questionIdsSql += ` LIMIT ?, ?`;
    const questionIdsParamsWithPagination = [...questionIdsParams, offset, limit];
    
    console.log("Question IDs SQL:", questionIdsSql);
    console.log("Question IDs Params:", questionIdsParamsWithPagination);

    // Get total count first
    mysqlcon.query(countSql, questionIdsParams, (countErr, countResult) => {
      if (countErr) {
        console.error("Count error:", countErr);
        return res.status(500).json({ error: "Database error", details: countErr.message });
      }

      const total = countResult[0]?.total || 0;

      // Get question IDs
      mysqlcon.query(questionIdsSql, questionIdsParamsWithPagination, async (idsErr, idsResult) => {
        if (idsErr) {
          console.error("IDs error:", idsErr);
          return res.status(500).json({ error: "Database error", details: idsErr.message });
        }

        if (idsResult.length === 0) {
          return res.status(200).json({
            success: 1,
            message: "No Questions Found",
            results: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0
            }
          });
        }

        // Extract IDs
        const questionIds = idsResult.map(row => row.id);
        
        // Step 2: Get full question details for these IDs
        const questionsSql = `
          SELECT 
            q.*,
            c.name as category,
            (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) as answer_count,
            (SELECT COALESCE(SUM(vote_type), 0) FROM votes v WHERE v.question_id = q.id) as vote_count
          FROM questions q
          LEFT JOIN categories c ON q.category_id = c.id
          WHERE q.id IN (${questionIds.map(() => '?').join(',')})
          ORDER BY FIELD(q.id, ${questionIds.map(() => '?').join(',')})
        `;
        
        const questionsParams = [...questionIds, ...questionIds];
        
        mysqlcon.query(questionsSql, questionsParams, async (questionsErr, questions) => {
          if (questionsErr) {
            console.error("Questions error:", questionsErr);
            return res.status(500).json({ error: "Database error", details: questionsErr.message });
          }

          // Process results
          const processedResults = await Promise.all(questions.map(async (question) => {
            try {
              const voteCount = await getTotalVotes(question.id, "question");
              const author = await findUser(question.user_id);
              const comments = await findComments(question.id, "question");
              
              let tags = [];
              if (question.tags) {
                try {
                  tags = JSON.parse(question.tags);
                } catch (e) {
                  console.warn("Error parsing tags:", e.message);
                }
              }
// console.log("question is +++++++++++++++++",question)
              return {
                id: question.id,
                title: question.title,
                body: question.body,
                user_id: question.user_id,
                slug: question.slug,
                tags: tags,
                createdAt: question.createdAt,
                category: question.category,
                answer_count: question.answer_count || 0,
                vote_count: question.vote_count || 0,
                isPost:question.isPost || 0,
                mediaUrl:question.mediaUrl,
                brief:question.brief,
                votes: voteCount,
                author: author,
                comments: comments
              };
            } catch (error) {
              console.error("Error processing question:", error);
              return {
                ...question,
                votes: 0,
                author: null,
                comments: [],
                tags: []
              };
            }
          }));

          res.status(200).json({
            success: 1,
            message: "Questions Fetched Successfully",
            results: processedResults,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit)
            }
          });
        });
      });
    });

  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
};

// const getQuestions = async (req, res) => {
//   // Get query parameters for sorting, filtering, and pagination
//   const sort = req.query.sort || 'newest';
//   const filter = req.query.filter || '';
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const offset = (page - 1) * limit;
//   const userId = req.query.userId || null;
//   const categoryId = req.query.category || null;

//   // Define the base SQL query for selecting questions
//   let sql = `
//     SELECT 
//       q.id, q.title, q.body, q.user_id, q.slug, q.tags, q.createdAt, c.name as category,
//       COUNT(DISTINCT a.id) AS answer_count, 
//       COALESCE(SUM(vote.vote_type), 0) AS vote_count
//     FROM questions q 
//     LEFT JOIN answers a ON q.id = a.question_id 
//     LEFT JOIN votes vote ON q.id = vote.question_id 
//     LEFT JOIN categories c ON q.category_id = c.id
//     WHERE q.is_hidden = 0
//   `;

//   // Add WHERE clause to filter questions by answered/unanswered using the filter parameter
//   if (filter === "answered") {
//     sql += `
//       AND q.id IN (
//         SELECT DISTINCT question_id FROM answers WHERE question_id IS NOT NULL
//       )
//     `;
//   } else if (filter === "unanswered") {
//     sql += `
//       AND q.id NOT IN (
//         SELECT DISTINCT question_id FROM answers WHERE question_id IS NOT NULL
//       )
//     `;
//   }

//   // Add GROUP BY clause to group questions by their ID
//   sql += `
//     GROUP BY q.id, q.title, q.body, q.user_id, q.slug, q.tags, q.createdAt, c.name
//   `;

//   // Add HAVING clause for answered/unanswered based on answer_count
//   if (filter === "answered") {
//     sql += ` HAVING answer_count > 0`;
//   } else if (filter === "unanswered") {
//     sql += ` HAVING answer_count = 0`;
//   }

//   // Add ORDER BY clause to sort questions
//   switch (sort) {
//     case "unanswered":
//       sql += `
//         ORDER BY answer_count ASC, q.createdAt DESC
//       `;
//       break;
//     case "popular":
//       sql += `
//         ORDER BY vote_count DESC, answer_count DESC, q.createdAt DESC
//       `;
//       break;
//     case "highest-votes":
//       sql += `
//         ORDER BY vote_count DESC, q.createdAt DESC
//       `;
//       break;
//     case "most-votes":
//       sql += `
//         ORDER BY vote_count DESC, q.createdAt DESC
//       `;
//       break;
//     case "my-questions":
//       if (userId) {
//         // For my questions, we need to filter by user_id
//         sql = sql.replace("WHERE q.is_hidden = 0", `WHERE q.is_hidden = 0 AND q.user_id = ${userId}`);
//         sql += ` ORDER BY q.createdAt DESC`;
//       } else {
//         sql += ` ORDER BY q.createdAt DESC`;
//       }
//       break;
//     case "my-answers":
//       if (userId) {
//         // For questions I've answered
//         sql = sql.replace("WHERE q.is_hidden = 0", `WHERE q.is_hidden = 0 AND q.id IN (SELECT DISTINCT question_id FROM answers WHERE user_id = ${userId})`);
//         sql += ` ORDER BY q.createdAt DESC`;
//       } else {
//         sql += ` ORDER BY q.createdAt DESC`;
//       }
//       break;
//     case "newest":
//     default:
//       sql += `
//         ORDER BY q.createdAt DESC
//       `;
//       break;
//   }

//   // Add LIMIT and OFFSET clauses for pagination
//   sql += `
//     LIMIT ?, ?
//   `;

//   console.log("Executing SQL:", sql); // Debug log

//   try {
//     // First, get total count for pagination
//     let countSql = `
//       SELECT COUNT(DISTINCT q.id) as total
//       FROM questions q 
//       WHERE q.is_hidden = 0
//     `;

//     if (filter === "answered") {
//       countSql += ` AND q.id IN (SELECT DISTINCT question_id FROM answers WHERE question_id IS NOT NULL)`;
//     } else if (filter === "unanswered") {
//       countSql += ` AND q.id NOT IN (SELECT DISTINCT question_id FROM answers WHERE question_id IS NOT NULL)`;
//     }

//     if (sort === "my-questions" && userId) {
//       countSql += ` AND q.user_id = ${userId}`;
//     } else if (sort === "my-answers" && userId) {
//       countSql += ` AND q.id IN (SELECT DISTINCT question_id FROM answers WHERE user_id = ${userId})`;
//     }

//     mysqlcon.query(countSql, async (countErr, countResult) => {
//       if (countErr) {
//         console.error("Error getting count:", countErr);
//         return res.status(500).json({ 
//           error: "Internal Server Error",
//           details: countErr.message 
//         });
//       }

//       const total = countResult[0]?.total || 0;

//       // Execute the SQL query with the specified parameters
//       mysqlcon.query(sql, [offset, limit], async (err, results) => {
//         if (err) {
//           console.error("Error executing SQL query:", err.message);
//           return res.status(500).json({ 
//             error: "Internal Server Error",
//             details: err.message 
//           });
//         }
        
//         if (results.length > 0) {
//           // Process each result to get additional data
//           const processedResults = await Promise.all(results.map(async (result) => {
//             try {
//               let voteCount = await getTotalVotes(result.id, "question");
//               let user = await findUser(result.user_id);
//               let comments = await findComments(result.id, "question");
//               let tags = [];
              
//               // Parse tags safely
//               if (result.tags) {
//                 try {
//                   tags = JSON.parse(result.tags);
//                 } catch (e) {
//                   console.warn("Error parsing tags for question ID:", result.id, e.message);
//                 }
//               }
              
//               return {
//                 ...result,
//                 votes: voteCount,
//                 author: user,
//                 comments,
//                 tags,
//               };
//             } catch (error) {
//               console.error("Error processing question ID:", result.id, error);
//               return {
//                 ...result,
//                 votes: 0,
//                 author: null,
//                 comments: [],
//                 tags: [],
//               };
//             }
//           }));
          
//           return res.status(200).json({
//             success: 1,
//             message: "Questions Fetched Successfully",
//             results: processedResults,
//             pagination: {
//               page,
//               limit,
//               total,
//               totalPages: Math.ceil(total / limit)
//             }
//           });
//         } else {
//           return res.status(200).json({
//             success: 1,
//             message: "No Questions Found",
//             results: [],
//             pagination: {
//               page,
//               limit,
//               total,
//               totalPages: 0
//             }
//           });
//         }
//       });
//     });
//   } catch (error) {
//     console.error("Error in getQuestions function:", error.stack);
//     return res.status(500).json({ 
//       error: "Something went wrong",
//       details: error.message 
//     });
//   }
// };

const getQuestionsByEmail = async (req, res) => {
  const { email } = req.query;
  const apiKey = req.headers["x-api-key"];
  // const instituteId = req.headers['x-institute-id'];
  const instituteId = req.institute.id;

  const { database_name } = req.institute;

  if (!apiKey || !instituteId) {
    return res
      .status(400)
      .json({ error: "API key and institute ID are required" });
  }

  if (!email) {
    return res.status(400).json({ error: "Email ID is required" });
  }

  const isAuthenticated = await authenticateApiKey(apiKey, instituteId);

  if (!isAuthenticated) {
    return res.status(401).json({ error: "Invalid API key or institute ID" });
  }

  try {
    mysqlcon.query(
      `SELECT * FROM institutes WHERE id=${instituteId}`,
      async (err, dbName) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        console.log("DB Name: ", database_name);
        if (dbName.length) {
          if (dbName[0]?.database_name) {
            const userId = await getUserIDByEmail(email);
            let sql = `SELECT * FROM questions WHERE user_id = '${userId}'`;
            mysqlcon.query(sql, async (err, results) => {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  message: "Internal Server Error",
                });
              }
              if (results.length) {
                for (var i = 0; i < results.length; i++) {
                  let voteCount = await getTotalVotes(
                    results[i].id,
                    "question"
                  );
                  let user = await findUser(results[i].user_id);
                  let comments = await findComments(results[i].id, "question");
                  results[i] = {
                    ...results[i],
                    votes: voteCount,
                    auther: user,
                    comments,
                  };
                }
                return res.status(200).json({
                  success: 1,
                  message: "Question Fetched Successfully",
                  results,
                });
              } else {
                return res.status(200).json({
                  success: 1,
                  message: "No Questions Found",
                  results,
                });
              }
            });
          } else {
            return res.status(409).json({ message: "Contact Admin" });
          }
        } else {
          return res
            .status(401)
            .json({ message: "Unautherized Access, Institute not found" });
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong" });
  }
};

const getQuestionsByCategories = (req, res) => {
  // Get query parameters for sorting, filtering, and pagination
  const sort = req.query.sort || "newest";
  const filter = req.query.filter || "all";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const categoryId = req.query.categoryId;

  // Define the base SQL query for selecting questions
  let sql = `
     SELECT 
       q.id, q.title, q.body, q.user_id, q.slug, q.tags, q.createdAt, c.name as category,
       COUNT(a.id) AS answer_count, 
       SUM(vote.vote_type) AS vote_count
     FROM questions q 
     LEFT JOIN answers a ON q.id = a.question_id 
     LEFT JOIN votes vote ON q.id = vote.question_id 
     LEFT JOIN categories c ON q.category_id = c.id
   `;

  // Add WHERE clause to category
  if (categoryId) {
    sql += ` 
        WHERE q.category_id = ${categoryId}
        `;
  }

  // Add AND conditions between category and filter clause
  if ((categoryId && filter === "answered") || filter === "unanswered") {
    sql += ` AND `;
  }

  if (categoryId) {
    // Add WHERE clause to filter questions by answered/unanswered
    if (filter === "answered") {
      sql += `
        q.id IN (
         SELECT question_id FROM answers GROUP BY question_id
       )
     `;
    } else if (filter === "unanswered") {
      sql += `
        q.id NOT IN (
         SELECT question_id FROM answers GROUP BY question_id
       )
     `;
    }
  } else {
    // Add WHERE clause to filter questions by answered/unanswered
    if (filter === "answered") {
      sql += `
       WHERE q.id IN (
         SELECT question_id FROM answers GROUP BY question_id
       )
     `;
    } else if (filter === "unanswered") {
      sql += `
       WHERE q.id NOT IN (
         SELECT question_id FROM answers GROUP BY question_id
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
    case "unanswered":
      sql += `
         ORDER BY answer_count ASC, vote_count DESC
       `;
      break;
    case "popular":
      sql += `
         ORDER BY vote_count DESC, answer_count DESC
       `;
      break;
    case "highest-votes":
      sql += `
         ORDER BY vote_count DESC
       `;
      break;
    case "most-frequent":
      sql += `
         ORDER BY COUNT(q.id) DESC
       `;
      break;
    case "recent-activity":
      sql += `ORDER BY COALESCE(MAX(q.createdAt), 0), COALESCE(MAX(a.createdAt), 0), COALESCE(MAX(vote.createdAt), 0) DESC`;
      break;
    case "newest":
    default:
      // sql += `
      //    ORDER BY q.createdAt DESC
      //  `;
      break;
  }

  sql += `
         ORDER BY q.createdAt DESC
       `;
  // Add LIMIT and OFFSET clauses for pagination
  sql += `
     LIMIT ?, ?
   `;

  try {
    // Execute the SQL query with the specified parameters
    console.log("Query: ", sql);
    mysqlcon.query(sql, [offset, limit], async (err, results) => {
      if (err) {
        console.error("Error executing SQL query:", err.stack);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (results.length) {
        for (var i = 0; i < results.length; i++) {
          let voteCount = await getTotalVotes(results[i].id, "question");
          let user = await findUser(results[i].user_id);
          let comments = await findComments(results[i].id, "question");
          let tags = [];
          try {
            tags = JSON.parse(results[i].tags);
          } catch (e) {
            console.error("Error parsing tags for question ID:", results[i].id);
          }
          results[i] = {
            ...results[i],
            votes: voteCount,
            auther: user,
            comments,
            tags,
          };
        }
        return res.status(200).json({
          success: 1,
          message: "Question Fetched Successfully",
          results,
        });
      } else {
        return res.status(200).json({
          success: 1,
          message: "No Questions Found",
          results,
        });
      }
    });
  } catch (error) {
    console.error("Error executing SQL query:", error.stack);
    return res.status(500).json({ error: "Something went wrong" });
  }
};




// const getQuestionsByUserId = async (req, res) => {
//   // Get query parameters for sorting, filtering, and pagination
//   const sort = req.query.sort || "newest";
//   const filter = req.query.filter || "all";
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const offset = (page - 1) * limit;
//   const userId = req.query.userId;

//   if (!userId) {
//     return res.status(409).json({ message: "User Id is required" });
//   }

//   // Define the base SQL query for selecting questions
//   let sql = `
//       SELECT 
//         q.id, q.title, q.body, q.user_id, q.slug, q.tags, q.createdAt, c.name as category,
//         (SELECT COUNT(*) FROM questions WHERE user_id = ?) AS length,
//         COUNT(a.id) AS answer_count, 
//         SUM(vote.vote_type) AS vote_count
//       FROM questions q 
//       LEFT JOIN answers a ON q.id = a.question_id 
//       LEFT JOIN votes vote ON q.id = vote.question_id 
//       LEFT JOIN categories c ON q.category_id = c.id 
//       WHERE q.user_id = ?
//     `;

//   // Add WHERE clause to filter questions by answered/unanswered
//   if (filter === "answered") {
//     sql += `
//         AND q.id IN (
//           SELECT question_id FROM answers GROUP BY question_id
//         )
//       `;
//   } else if (filter === "unanswered") {
//     sql += `
//         AND q.id NOT IN (
//           SELECT question_id FROM answers GROUP BY question_id
//         )
//       `;
//   }

//   // Add GROUP BY clause to group questions by their ID
//   sql += `
//       GROUP BY q.id
//     `;

//   // Add ORDER BY clause to sort questions
//   switch (sort) {
//     case "unanswered":
//       sql += `
//           ORDER BY answer_count ASC, vote_count DESC
//         `;
//       break;
//     case "popular":
//       sql += `
//           ORDER BY vote_count DESC, answer_count DESC
//         `;
//       break;
//     case "highest-votes":
//       sql += `
//           ORDER BY vote_count DESC
//         `;
//       break;
//     case "most-frequent":
//       sql += `
//           ORDER BY COUNT(q.id) DESC
//         `;
//       break;
//     case "recent-activity":
//       sql += `ORDER BY COALESCE(MAX(q.createdAt), 0), COALESCE(MAX(a.createdAt), 0), COALESCE(MAX(vote.createdAt), 0) DESC`;
//       break;
//     case "newest":
//     default:
//       // sql += `
//       //     ORDER BY q.createdAt DESC
//       //   `;
//       break;
//   }

//   sql += `
//          ORDER BY q.createdAt DESC
//        `;
//   // Add LIMIT and OFFSET clauses for pagination
//   sql += `
//       LIMIT ? OFFSET ?
//     `;

//   try {
//     // console.log("Query: ", sql);
//     mysqlcon.query(sql, [userId, userId, limit, offset], async (err, results) => {
//       if (err) {
//         console.error("Error executing SQL query:", err.stack);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }
//       if (results.length) {
//         for (var i = 0; i < results.length; i++) {
//           let voteCount = await getTotalVotes(results[i].id, "question");
//           let user = await findUser(results[i].user_id);
//           let comments = await findComments(results[i].id, "question");
//           let tags = JSON.parse(results[i].tags) || [];
//           results[i] = {
//             ...results[i],
//             votes: voteCount,
//             auther: user,
//             comments,
//             tags,
//           };
//         }
//         return res.status(200).json({
//           success: 1,
//           message: "Question Fetched Successfully",
//           results,
//         });
//       } else {
//         return res.status(200).json({
//           success: 1,
//           message: "No Questions Found",
//           results,
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Error executing SQL query:", error.stack);
//     return res.status(500).json({ error: "Something went wrong" });
//   }
// };


const getQuestionsByUserId = async (req, res) => {
  // Get query parameters for sorting, filtering, and pagination
  const sort = req.query.sort || "newest";
  const filter = req.query.filter || "all";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const userId = req.query.userId;

  if (!userId) {
    return res.status(409).json({ message: "User Id is required" });
  }

  // Define the base SQL query for selecting questions
  let sql = `
      SELECT 
        q.id, q.title, q.body, q.user_id, q.slug, q.tags, q.createdAt, c.name as category,
        (SELECT COUNT(*) FROM questions WHERE user_id = ?) AS length,
        COUNT(a.id) AS answer_count, 
        SUM(vote.vote_type) AS vote_count
      FROM questions q 
      LEFT JOIN answers a ON q.id = a.question_id 
      LEFT JOIN votes vote ON q.id = vote.question_id 
      LEFT JOIN categories c ON q.category_id = c.id 
      WHERE q.user_id = ?
    `;

  // Add WHERE clause to filter questions by answered/unanswered
  if (filter === "answered") {
    sql += `
        AND q.id IN (
          SELECT question_id FROM answers GROUP BY question_id
        )
      `;
  } else if (filter === "unanswered") {
    sql += `
        AND q.id NOT IN (
          SELECT question_id FROM answers GROUP BY question_id
        )
      `;
  }

  // Add GROUP BY clause to group questions by their ID
  sql += `
      GROUP BY q.id
    `;

  // Add ORDER BY clause to sort questions
  switch (sort) {
    case "unanswered":
      sql += `
          ORDER BY answer_count ASC, vote_count DESC
        `;
      break;
    case "popular":
      sql += `
          ORDER BY vote_count DESC, answer_count DESC
        `;
      break;
    case "highest-votes":
      sql += `
          ORDER BY vote_count DESC
        `;
      break;
    case "most-frequent":
      sql += `
          ORDER BY COUNT(q.id) DESC
        `;
      break;
    case "recent-activity":
      sql += `ORDER BY COALESCE(MAX(q.createdAt), 0), COALESCE(MAX(a.createdAt), 0), COALESCE(MAX(vote.createdAt), 0) DESC`;
      break;
    case "newest":
    default:
      // sql += `
      //     ORDER BY q.createdAt DESC
      //   `;
      break;
  }

  sql += `
         ORDER BY q.createdAt DESC
       `;
  // Add LIMIT and OFFSET clauses for pagination
  sql += `
      LIMIT ? OFFSET ?
    `;

  try {
    // console.log("Query: ", sql);
    mysqlcon.query(sql, [userId, userId, limit, offset], async (err, results) => {
      if (err) {
        console.error("Error executing SQL query:", err.stack);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (results.length) {
        for (var i = 0; i < results.length; i++) {
          let voteCount = await getTotalVotes(results[i].id, "question");
          let user = await findUser(results[i].user_id);
          let comments = await findComments(results[i].id, "question");
          
          // FIX: Handle the tags field properly with null/undefined checks
          let tags = [];
          const tagsValue = results[i].tags;
          
          if (tagsValue) {
            try {
              // Try to parse as JSON first
              const parsedTags = JSON.parse(tagsValue);
              // If parsing succeeded and it's an array, use it
              if (Array.isArray(parsedTags)) {
                tags = parsedTags;
              } else if (parsedTags !== null && parsedTags !== undefined) {
                // If it's not null/undefined, convert to string and wrap in array
                tags = [String(parsedTags)];
              }
            } catch (error) {
              // If JSON.parse fails, it's probably a plain string
              // Convert to string first to ensure trim() works
              const tagsString = String(tagsValue);
              if (tagsString.includes(',')) {
                tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
              } else if (tagsString.trim() !== '') {
                tags = [tagsString.trim()];
              }
            }
          }
          
          results[i] = {
            ...results[i],
            votes: voteCount,
            auther: user,
            comments,
            tags, // Now this is always an array (empty if no tags)
          };
        }
        return res.status(200).json({
          success: 1,
          message: "Question Fetched Successfully",
          results,
        });
      } else {
        return res.status(200).json({
          success: 1,
          message: "No Questions Found",
          results,
        });
      }
    });
  } catch (error) {
    console.error("Error executing SQL query:", error.stack);
    return res.status(500).json({ error: "Something went wrong" });
  }
};



const postQuestion = async (req, res) => {
  let { userId, title, body, categoryId, tags,mediaUrl } = req.body;

  console.log("Question Req Body", req.body);

  if (!userId || !body || !title || !categoryId) {
    return res.status(400).json({ message: "Question details are missing" });
  }

  title = title.replaceAll("'", "''");
  body = body.replaceAll("'", "''");
  let slug =
    slugify(
      title.toLowerCase().replaceAll(`[^a-zA-Z0-9()!@#$%^&*|\<>,./?_]`, "-")
    ) + uid(5);

  try {
    mysqlcon.query(
      `SELECT COUNT(*) as count FROM questions WHERE slug = '${slug}'`,
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        if (result[0].count > 0) {
          slug = slug + "-" + uid(5);
        }

        try {
          let sql = `INSERT INTO questions(user_id, title, body, category_id, slug, tags,mediaUrl) values(?, ?, ?, ?, ?, ?,?);`;
          let values = [userId, title, body, categoryId, slug, tags,mediaUrl];
          mysqlcon.query(sql, values, (err) => {
            if (err) {
              console.log(err);
              return res.status(500).json({
                message: "Internal Server Error",
              });
            }
            return res.status(200).json({
              success: 1,
              message: "Question Posted Successfully",
              slug,
            });
          });
        } catch (error) {
          console.log(error);
          res.status(400).json({ message: "Something went wrong" });
        }
      }
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};



const updateQuestion = async (req, res) => {
  const id = req.params.id;
  const { email, title, body, mediaUrl } = req.body;

  // Validate required fields
  if (!email || !title || !body) {
    return res.status(400).json({ 
      error: "Missing required fields. Email, title, and body are required." 
    });
  }

  try {
    // Check if the question exists
    const checkQuestionSql = `SELECT * FROM questions WHERE id = ?`;
    
    mysqlcon.query(checkQuestionSql, [id], async (err, results) => {
      if (err) {
        console.error("Error executing SQL query:", err.stack);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }

      const question = results[0];

      // Get user ID by email
      const userId = await getUserIDByEmail(email).catch((err) => {
        console.error("Error getting user ID:", err);
        return null;
      });
      
      if (!userId) {
        return res.status(404).json({ message: "User Not Found" });
      }

      // Check if the user is authorized to edit the question
      if (userId != question.user_id) { // Use != instead of !== for comparison
        return res.status(403).json({ 
          error: "Unauthorized: You can only edit your own questions" 
        });
      }

      // Prepare update data
      const updateData = [];
      const updateFields = [];
      
      if (title !== undefined) {
        updateFields.push("title = ?");
        updateData.push(title);
      }
      
      if (body !== undefined) {
        updateFields.push("body = ?");
        updateData.push(body);
      }
      
      if (mediaUrl !== undefined) {
        updateFields.push("mediaUrl = ?");
        updateData.push(mediaUrl);
      }
      
      // Add updatedAt timestamp
      updateFields.push("updatedAt = CURRENT_TIMESTAMP");
      
      // Add the id for WHERE clause
      updateData.push(id);

      // Check if there are fields to update
      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      // Update the question in the database
      const updateQuestionSql = `UPDATE questions SET ${updateFields.join(", ")} WHERE id = ?`;
      
      mysqlcon.query(updateQuestionSql, updateData, (err, results) => {
        if (err) {
          console.error("Error executing SQL query:", err.stack);
          return res.status(500).json({ error: "Internal Server Error", details: err.message });
        }
        
        // Get the updated question to return
        mysqlcon.query(`SELECT * FROM questions WHERE id = ?`, [id], (err, updatedResults) => {
          if (err) {
            console.error("Error fetching updated question:", err.stack);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          
          res.status(200).json({ 
            message: "Question updated successfully",
            question: updatedResults[0]
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in updateQuestion function:", error);
    return res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message 
    });
  }
};

const getQuestionsByID = async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ error: "Question ID is required" });
  }

  try {
    let sql = `SELECT * FROM questions WHERE id = '${id}'`;
    mysqlcon.query(sql, async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          message: "Internal Server Error",
        });
      }
      if (results.length) {
        for (var i = 0; i < results.length; i++) {
          let voteCount = await getTotalVotes(results[i].id, "question");
          let user = await findUser(results[i].user_id);
          let comments = await findComments(results[i].id, "question");
          let tags = JSON.parse(results[i].tags) || [];
          results[i] = {
            ...results[i],
            votes: voteCount,
            auther: user,
            comments,
            tags,
          };
        }
        return res.status(200).json({
          success: 1,
          message: "Question Fetched Successfully",
          results: results[0],
        });
      } else {
        return res.status(200).json({
          success: 1,
          message: "No Questions Found",
          results,
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong" });
  }
};

const getQuestionsBySlug = async (req, res) => {
  const slug = req.params.slug;

  if (!slug || slug === "undefined" || slug === "null") {
    return res.status(400).json({ error: "Slug is required" });
  }

  try {
    mysqlcon.query(
      `SELECT * FROM questions WHERE slug = ? LIMIT 1`,
      [slug],
      async (err, results) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            message: "Internal Server Error",
          });
        }
        if (!results?.length) {
          return res.status(404).json({
            success: 0,
            message: "No Questions Found",
            results: null,
          });
        }

        try {
          const row = results[0];
          let voteCount = 0;
          let user = null;
          let comments = [];
          try {
            voteCount = await getTotalVotes(row.id, "question");
          } catch (e) {
            console.log("getQuestionsBySlug votes:", e?.message || e);
          }
          try {
            user = await findUser(row.user_id);
          } catch (e) {
            console.log("getQuestionsBySlug author:", e?.message || e);
          }
          try {
            comments = await findComments(row.id, "question");
          } catch (e) {
            console.log("getQuestionsBySlug comments:", e?.message || e);
          }

          let tags = [];
          try {
            if (row.tags && typeof row.tags === "string") {
              tags = JSON.parse(row.tags);
            } else if (row.tags) {
              tags = row.tags;
            }
          } catch (error) {
            tags = [row.tags];
            console.log(
              `Tag parsing warning for question ${row.id}: ${error.message}`,
            );
          }
          if (!Array.isArray(tags)) tags = [];
          // Normalize string tags to { name } for frontend
          tags = tags.map((t) =>
            typeof t === "string" ? { name: t } : t,
          );

          return res.status(200).json({
            success: 1,
            message: "Question Fetched Successfully",
            results: {
              ...row,
              votes: voteCount,
              author: user,
              comments,
              tags,
            },
          });
        } catch (enrichErr) {
          console.error("getQuestionsBySlug enrich:", enrichErr);
          return res.status(500).json({ message: "Internal Server Error" });
        }
      },
    );
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong" });
  }
};

const getQuestionsByUser = async (req, res) => {
  const { userId } = req.params;
  const { page, limit, sortBy } = req.query;
  const offset = (page - 1) * limit;
  let orderBy = "";

  switch (sortBy) {
    case "votes":
      orderBy = "votes DESC";
      break;
    case "activity":
      orderBy = "updatedAt DESC";
      break;
    case "newest":
      orderBy = "createdAt DESC";
      break;
    default:
      orderBy = "createdAt DESC";
  }

  try {
    mysqlcon.query(
      `SELECT * FROM questions WHERE user_id = ? ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [userId, limit, offset],
      async (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        for (let i = 0; i < result.length; i++) {
          let votes = await getTotalVotes(result[i]?.id, "question");
          result[i] = { ...result[i], votes: votes };
        }
        return res.status(200).json({
          page,
          limit,
          result,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTrendingQuestions = async (req, res) => {
  // console.log("Body: ", req.body);
  // console.log("Request Query: ", req.query);
  switch (req.query.type) {
    case "expertise":
      let expertise = req.body.expertise;
      try {
        // Find relevant questions based on the extracted keywords
        const query = `SELECT id, title, body, user_id, tags, createdAt, updatedAt, 
                    (SELECT COUNT(*) FROM answers WHERE question_id = questions.id) AS answer_count, 
                    (SELECT COUNT(*) FROM votes WHERE question_id = questions.id AND vote_type = 'upvote') - 
                    (SELECT COUNT(*) FROM votes WHERE question_id = questions.id AND vote_type = 'downvote') AS vote_count 
                    FROM questions 
                    WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND title LIKE '%${expertise}%' OR body LIKE '%${expertise}%'
                    ORDER BY vote_count DESC, answer_count DESC LIMIT 3`;
        // console.log("Query getTrendingQuestions1 : ",query);
        mysqlcon.query(query, [expertise], async (err, results) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ message: "Internal Server Error" });
          }
          for (let i = 0; i < results.length; i++) {
            let author = await findUser(results[i].user_id);
            let tags = JSON.parse(results[i].tags) || [];
            results[i] = { ...results[i], author: author, tags };
          }
          return res.status(200).json({
            results,
            message: "Questions Found",
          });
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
      break;

    default:
      try {
        const query = `SELECT id, title, body, user_id, tags, createdAt, updatedAt, 
                (SELECT COUNT(*) FROM answers WHERE question_id = questions.id) AS answer_count, 
                (SELECT COUNT(*) FROM votes WHERE question_id = questions.id AND vote_type = 'upvote') - 
                (SELECT COUNT(*) FROM votes WHERE question_id = questions.id AND vote_type = 'downvote') AS vote_count 
                FROM questions 
                WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
                ORDER BY vote_count DESC, answer_count DESC LIMIT 3`
        // console.log("Query getTrendingQuestions2 : ",query);
        mysqlcon.query(query, async (err, results) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ message: "Internal Server Error" });
          }
          for (let i = 0; i < results.length; i++) {
            let author = await findUser(results[i].user_id);
            let tags = JSON.parse(results[i].tags) || [];
            results[i] = { ...results[i], author: author, tags };
          }
          return res.status(200).json({
            results,
            message: "Questions Found",
          });
        });
      } catch (error) {
        console.error("GetTrandingQuestion Error : ", error);
        res.status(500).json({ error: "Internal server error" });
      }
      break;
  }
};

const getRelevantQuestions = (req, res) => {
  const { slug } = req.query;

  try {
    // Get the current question
    const query = `
      SELECT title, tags
      FROM questions
      WHERE slug = ?
    `;
    mysqlcon.query(query, [slug], (err, currentQuestion) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (currentQuestion.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }

      const { title, tags } = currentQuestion[0];
      const keywords = extractKeywords(title);

      // Find relevant questions based on the extracted keywords
      const relevantQuery = `
          SELECT id, user_id, title, tags
          FROM questions
          WHERE id <> ? AND tags REGEXP ?
          ORDER BY createdAt DESC
          LIMIT 10
        `;
      mysqlcon.query(
        relevantQuery,
        [slug, keywords.join("|")],
        async (err, relevantQuestions) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          for (let i = 0; i < relevantQuestions.length; i++) {
            let author = await findUser(relevantQuestions[i].user_id);
            let tags = JSON.parse(relevantQuestions[i].tags) || [];
            relevantQuestions[i] = {
              ...relevantQuestions[i],
              author: author,
              tags,
            };
          }
          return res.json({ relevantQuestions });
        }
      );
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteQuestion = (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.id;

  if (!userId) {
    console.log({ questionId, userId });
    return res.status(401).json({ message: "Access Denied" });
  }
  if (!questionId) {
    console.log({ questionId, userId });
    return res.status(400).json({ message: "Bad Request" });
  }

  const query = "DELETE FROM questions WHERE id = ? AND user_id = ?";
  mysqlcon.query(query, [questionId, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete question" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    return res.status(200).json({ message: "Question deleted successfully" });
  });
};

const hideQuestion = (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.id;

  try {
    const query = 'UPDATE questions SET is_hidden = 1 WHERE id = ? AND user_id = ?';
    mysqlcon.query(query, [questionId, userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to hide question' });
      }

      if (result.affectedRows === 0) {
        return res.status(401).json({ message: 'Question not found or user is not the author' });
      }

      res.status(200).json({ message: 'Question hidden successfully' });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

const unHideQuestion = (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.id;

  try {
    const query = 'UPDATE questions SET is_hidden = 1 WHERE id = ? AND user_id = ?';
    mysqlcon.query(query, [questionId, userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to hide question' });
      }

      if (result.affectedRows === 0) {
        return res.status(401).json({ message: 'Question not found or user is not the author' });
      }

      return res.status(200).json({ message: 'Question visible successfully' });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

const getRecentQuestions = (req, res) => {
  const limit = req.query.limit || 4; // Number of recent questions to retrieve

  try {
    // SQL query to fetch recent questions
    const query = `SELECT * FROM questions ORDER BY createdAt DESC LIMIT ${limit}`;

    // Execute query
    mysqlcon.query(query, async (err, results) => {
      if (err) {
        console.error("Error fetching recent questions: ", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      for (let i = 0; i < results.length; i++) {
        let author = await findUser(results[i].user_id);
        let tags = JSON.parse(results[i].tags) || [];
        results[i] = { ...results[i], author: author, tags };
      }

      // Send the recent questions as the API response
      res.status(200).json({
        message: "Questions Found",
        results,
      });
    });
  } catch (err) {
    console.error("Error fetching recent questions: ", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getFeaturedQuestions = (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'popular'; // Get the sort option from the query parameters

    let query = `
      SELECT q.id, q.slug, q.title, q.user_id, c.name AS category,
      COUNT(DISTINCT a.id) AS answer_count,
      COUNT(DISTINCT vq.id) AS question_vote_count,
      COALESCE(SUM(av.vote_count), 0) AS answer_vote_count,
      COUNT(DISTINCT cm.id) AS comment_count,
      COUNT(DISTINCT rp.id) AS reply_count,
      (
        10 * COUNT(DISTINCT vq.id) +
        5 * COUNT(DISTINCT a.id) +
        3 * COALESCE(SUM(av.vote_count), 0) +
        2 * COUNT(DISTINCT cm.id) +
        COUNT(DISTINCT rp.id)
      ) AS score
      FROM questions q 
      LEFT JOIN answers a ON q.id = a.question_id 
      LEFT JOIN votes vq ON q.id = vq.question_id 
      LEFT JOIN (
        SELECT a.id, COUNT(v.id) AS vote_count
        FROM answers a
        LEFT JOIN votes v ON a.id = v.answer_id
        GROUP BY a.id
      ) AS av ON a.id = av.id
      LEFT JOIN comments cm ON q.id = cm.question_id 
      LEFT JOIN replies rp ON cm.id = rp.comment_id 
      LEFT JOIN categories c ON q.category_id = c.id 
      `;

    if (sortBy === 'popular') {
      query += 'GROUP BY q.id ORDER BY score DESC';
    } else if (sortBy === 'trending') {
      query += 'GROUP BY q.id ORDER BY answer_count DESC, question_vote_count DESC, answer_vote_count DESC, comment_count DESC, reply_count DESC';
    } else if (sortBy === 'featured') {
      query += 'GROUP BY q.id ORDER BY RAND()';
    }

    query += ' LIMIT 4'; // Add the LIMIT clause to limit the results to 5

    mysqlcon.query(query, async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: 'Internal Server Error'
        });
      }

      for (const key in results) {
        let author = await findUser(results[key].user_id);
        results[key] = { ...results[key], author }
      }
      return res.status(200).json({
        message: 'Questions found',
        results,
        sortBy
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getTotalQuestions = async (req, res) => {
  const { userId } = req.params;

  try {
    mysqlcon.query(
      `SELECT * FROM questions WHERE user_id = ? ORDER BY createdAt DESC`, [userId], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Failed Fetch All question' });
        }

        if (result.affectedRows === 0) {
          return res.status(401).json({ message: 'Question not found or user is not the author' });
        }

        res.status(200).json({ message: 'Question Fetch successfully', questions: result });
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}


// controllers/questionController.js
const getSingleQuestion = async (req, res) => {
    const { questionId } = req.params;
    console.log("questionId is ", questionId);
    
    if (!questionId) {
        return res.status(400).json({ 
            success: false,
            message: "Question ID is required" 
        });
    }
    
    try {
        const [question] = await mysqlcon.promise().query(
            `SELECT 
                q.*,
                u.id as author_id,
                u.first_name as author_first_name,
                u.last_name as author_last_name,
                u.username as author_username,
                up.profile_pic as author_profile_pic,
                u.role as author_role,
                up.skills as author_expertise,
                c.name as category_name
            FROM questions q
            LEFT JOIN users u ON q.user_id = u.id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN categories c ON q.category_id = c.id
            WHERE q.id = ? AND q.is_hidden = 0`,
            [questionId]
        );
        
        if (question.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Question not found" 
            });
        }
        
        const questionData = question[0];
        
        // Get tags
        let tags = [];
        if (questionData.tags) {
            try {
                const tagIds = JSON.parse(questionData.tags);
                if (Array.isArray(tagIds) && tagIds.length > 0) {
                    const placeholders = tagIds.map(() => '?').join(',');
                    const [tagResults] = await mysqlcon.promise().query(
                        `SELECT * FROM tags WHERE id IN (${placeholders})`,
                        tagIds
                    );
                    tags = tagResults;
                }
            } catch (parseError) {
                console.error("Error parsing tags:", parseError);
            }
        }
        
        // Get comments count
        const [commentsCount] = await mysqlcon.promise().query(
            `SELECT COUNT(*) as count FROM comments WHERE question_id = ?`,
            [questionId]
        );
        
        // Get answers count
        const [answersCount] = await mysqlcon.promise().query(
            `SELECT COUNT(*) as count FROM answers WHERE question_id = ?`,
            [questionId]
        );
        
        // Get votes - FIXED QUERY FOR YOUR TABLE STRUCTURE
        const [votes] = await mysqlcon.promise().query(
            `SELECT 
                SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) as upVoteCount,
                SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) as downVoteCount
            FROM votes WHERE question_id = ?`,
            [questionId]
        );
        
        // Get comments
        const [comments] = await mysqlcon.promise().query(
            `SELECT 
                c.*,
                u.first_name,
                u.last_name,
                u.username,
                up.profile_pic
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE c.question_id = ?
            ORDER BY c.createdAt DESC`,
            [questionId]
        );
        
        // Get answers with their votes
        const [answers] = await mysqlcon.promise().query(
            `SELECT 
                a.*,
                u.first_name,
                u.last_name,
                u.username,
                up.profile_pic,
                COALESCE(v_up.upvotes, 0) as upvotes,
                COALESCE(v_down.downvotes, 0) as downvotes
            FROM answers a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN (
                SELECT answer_id, COUNT(*) as upvotes 
                FROM votes 
                WHERE answer_id IS NOT NULL AND vote_type = 'upvote'
                GROUP BY answer_id
            ) v_up ON a.id = v_up.answer_id
            LEFT JOIN (
                SELECT answer_id, COUNT(*) as downvotes 
                FROM votes 
                WHERE answer_id IS NOT NULL AND vote_type = 'downvote'
                GROUP BY answer_id
            ) v_down ON a.id = v_down.answer_id
            WHERE a.question_id = ?
            ORDER BY a.createdAt DESC`,
            [questionId]
        );
        
        // Get emoji reactions
        const [emojis] = await mysqlcon.promise().query(
            `SELECT 
                er.*,
                u.first_name,
                u.last_name,
                u.username,
                up.profile_pic
            FROM emoji_reactions er
            LEFT JOIN users u ON er.user_id = u.id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE er.question_id = ? AND er.deletedAt IS NULL
            ORDER BY er.createdAt DESC`,
            [questionId]
        );
        
        return res.status(200).json({
            success: true,
            results: {
                ...questionData,
                tags: tags,
                comments: comments || [],
                commentsCount: comments.length,
                answers: answers || [],
                answersCount: answers.length,
                votes: {
                    upVoteCount: votes[0]?.upVoteCount || 0,
                    downVoteCount: votes[0]?.downVoteCount || 0
                },
                emojis: emojis || [],
                author: {
                    id: questionData.author_id,
                    name: `${questionData.author_first_name} ${questionData.author_last_name}`,
                    username: questionData.author_username,
                    profile_pic: questionData.author_profile_pic,
                    role: questionData.author_role,
                    expertise: questionData.author_expertise
                }
            }
        });
    } catch (error) {
        console.error("Get single question error:", error);
        return res.status(500).json({ 
            success: false,
            message: "Something went wrong",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
  getQuestions,
  getQuestionsByUserId,
  // getQuestionsByEmail,
  getQuestionsByCategories,
  postQuestion,
  updateQuestion,
  getQuestionsBySlug,
  getQuestionsByID,
  getQuestionsByUser,
  getTrendingQuestions,
  getRelevantQuestions,
  deleteQuestion,
  hideQuestion,
  getRecentQuestions,
  unHideQuestion,
  getFeaturedQuestions,
  getTotalQuestions,
  getSingleQuestion
}
