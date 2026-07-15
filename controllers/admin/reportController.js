const { mysqlcon } = require("../../model/db");

const getReport = (req, res) => {
  try {
    mysqlcon.query(
      `SELECT r.user_id, r.item_id, r.reason, r.createdAt, r.status, r.comment, r.action, r.item_type, u.display_name AS name, u.username, u.email, u.avatar_url
      FROM reports r
      JOIN users u ON r.id = u.id;`,
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json({
          message: "Report found",
          result,
        });
      }
    );
  } catch (error) {
    console.error(err);
    return res.status(409).json({ message: "Something went wrong" });
  }
};

const deleteQuestion = async (req, res) => {
  const id = req.params.id;

  try {
    let querys = `SELECT * FROM questions WHERE id=?`;
    mysqlcon.query(querys, [id], async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: "Question not found" });
      } else {

        console.log("Question found, moving to trash");
        const question = results[0];

        let queryi = `INSERT INTO questions_trash(id,title,slug,tags,category_id,body,img,notification,is_answered,user_id,is_hidden,createdAt,updatedAt,brief) Values(?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
        mysqlcon.query(
          queryi,
          [
            question.id,
            question.title,
            question.slug,
            question.tags,
            question.category_id,
            question.body,
            question.img,
            question.notification,
            question.is_answered,
            question.user_id,
            question.is_hidden,
            question.createdAt,
            question.updatedAt,
            question.brief,
          ],
          async (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("Questin moved to trash successfully, deleting the question from origins");
            let queryd = `DELETE FROM questions WHERE id=?`;
            mysqlcon.query(queryd, [id], (err, results) => {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  message: "Failed to delete question",
                });
              }
              console.log("Question deleted sucessfully");
              return res.status(200).json({ message: "Question deleted successfully", results });
            });
          }
        );
      }

     
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete Report" });
  }
};



const deleteAnswer = async (req, res) => {
  const id = req.params.id;

  try {
    let querys = `SELECT * FROM answers WHERE id=?`;
    mysqlcon.query(querys, [id], async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: "Answer not found" });
      } else {

        console.log("Answer found, moving to trash");
        const answer = results[0];

        let queryi = `INSERT INTO answers_trash(id,title,body,user_id,question_id,createdAt,updatedAt) Values(?,?,?,?,?,?,?);`;
        mysqlcon.query(
          queryi,
          [
            answer.id,
            answer.title,
            answer.body,
            answer.user_id,
            answer.question_id,
            answer.createdAt,
            answer.updatedAt,
          ],
          async (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("Answer moved to trash successfully, deleting the answer from origins");
            let queryd = `DELETE FROM answers WHERE id=?`;
            mysqlcon.query(queryd, [id], (err, results) => {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  message: "Failed to delete answer",
                });
              }
              console.log("Answer deleted sucessfully");
              return res.status(200).json({ message: "Answer deleted successfully", results });
            });
          }
        );
      }

     
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete Report" });
  }
};



const deleteComment = async (req, res) => {
  const id = req.params.id;

  try {
    let querys = `SELECT * FROM comments WHERE id=?`;
    mysqlcon.query(querys, [id], async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: "Answer not found" });
      } else {

        console.log("Comment found, moving to trash");
        const comment = results[0];

        let queryi = `INSERT INTO comments_trash(id,question_id,answer_id,user_id,comment_text,createdAt,updatedAt) Values(?,?,?,?,?,?,?);`;
        mysqlcon.query(
          queryi,
          [
            comment.id,
            comment.title,
            comment.body,
            comment.user_id,
            comment.question_id,
            comment.createdAt,
            comment.updatedAt,
          ],
          async (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("Comment moved to trash successfully, deleting the comment from origins");
            let queryd = `DELETE FROM comments WHERE id=?`;
            mysqlcon.query(queryd, [id], (err, results) => {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  message: "Failed to delete answer",
                });
              }
              console.log("Comment deleted sucessfully");
              return res.status(200).json({ message: "Comment deleted successfully", results });
            });
          }
        );
      }

     
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete Report" });
  }
};



const deleteReply = async (req, res) => {
  const id = req.params.id;

  try {
    let querys = `SELECT * FROM replies WHERE id=?`;
    mysqlcon.query(querys, [id], async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: "Reply not found" });
      } else {

        console.log("Reply found, moving to trash");
        const reply = results[0];

        let queryi = `INSERT INTO replies_trash(id,comment_id,user_id,reply,createdAt,updatedAt) Values(?,?,?,?,?,?);`;
        mysqlcon.query(
          queryi,
          [
            reply.id,
            reply.title,
            reply.body,
            reply.user_id,
            reply.question_id,
            reply.createdAt,
            reply.updatedAt,
          ],
          async (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("Reply moved to trash successfully, deleting the reply from origins");
            let queryd = `DELETE FROM replies WHERE id=?`;
            mysqlcon.query(queryd, [id], (err, results) => {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  message: "Failed to delete answer",
                });
              }
              console.log("Reply deleted sucessfully");
              return res.status(200).json({ message: "Reply deleted successfully", results });
            });
          }
        );
      }

     
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete Report" });
  }
};




const getAnswers = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: "Question ID is required" });
  }

  try {
    let sql = `SELECT * FROM answers WHERE question_id=${id}`;
    mysqlcon.query(sql, async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          message: "Internal Server Error",
        });
      }
      if (results.length) {
        for (let i = 0; i < results.length; i++) {
          let user = await findUser(results[i].user_id);
          let votes = await getTotalVotes(results[i].id, "answer");
          let comments = await findComments(results[i].id, "answer");
          results[i] = { ...results[i], votes, auther: user, comments };
        }
        return res.status(200).json({
          success: 1,
          message: "Answer Fetched Successfully",
          results,
        });
      } else {
        return res.status(200).json({
          success: 0,
          message: "Answers Not Found",
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

  if (!slug) {
    return res.status(400).json({ error: "Slug is required" });
  }

  try {
    let sql = `SELECT * FROM questions WHERE slug = '${slug}'`;
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
          let tags = JSON.parse(results[i].tags);
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
module.exports = {
  getReport,
  deleteQuestion,
  deleteAnswer,
  deleteComment,
  deleteReply,
  getAnswers,
  getQuestionsBySlug,
};
