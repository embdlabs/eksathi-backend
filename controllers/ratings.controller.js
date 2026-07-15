const { log } = require("handlebars/runtime");
const { mysqlcon } = require("../model/db");
const { findUserRating } = require("../service/utilities.service");
const { DBMODELS, sequelize } = require("../models/init-models");
const { fn, col } = require("sequelize");

const postUserRating = async (req, res) => {
  const { questionId, answerId } = req.query;
  const { rating } = req.body;
  const userId = req.user.id; // Assuming the authenticated user's ID is available

  // Check if the question author matches the authenticated user
  const checkQuery = 'SELECT user_id FROM questions WHERE id = ?';
  mysqlcon.query(checkQuery, [questionId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (results.length === 0 || results[0].user_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to rate this answer.' });
    }

    // Get the answer author's ID
    const answerAuthorQuery = 'SELECT user_id FROM answers WHERE id = ?';
    mysqlcon.query(answerAuthorQuery, [answerId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Answer not found.' });
      }

      const answerAuthorId = results[0].user_id;

      // Save the rating
      const insertQuery = 'INSERT INTO ratings (user_id, rated_user_id, rating, is_rated) VALUES (?, ?, ?, 0)';
      mysqlcon.query(insertQuery, [userId, answerAuthorId, rating], async (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        // Update the `is_rated` field in the `answers` table
        const updateIsRatedQuery = 'UPDATE answers SET is_rated = 1 WHERE id = ? AND question_id = ? AND user_id = ?';
        mysqlcon.query(updateIsRatedQuery, [answerId, questionId, answerAuthorId], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          findUserRating(userId).then((newRating) => {
            mysqlcon.query(`UPDATE user_profiles SET rating = ? WHERE user_id = ?`, [newRating, userId], (err) => {
              if (err) {
                console.error(err);
              }
            })
          }).catch((err) => {
            console.error(err);
          });

          res.status(200).json({ message: 'Rating saved successfully.' });
        });
      });
    });
  });
}

// Give Rating Direct to Gyani's by home page gyani's list
const postRatingDirect = async (req, res) => {
  const { rating, ratedUserId } = req.body;
  const userId = req.query.userId;

  // Update the existing rating's is_rated to 1 if it exists
  const updateQuery = `
    UPDATE ratings 
    SET is_rated = 1 
    WHERE user_id = ? AND rated_user_id = ?
    `;

  mysqlcon.query(updateQuery, [userId, ratedUserId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const insertQuery = 'INSERT INTO ratings (user_id, rated_user_id, rating, is_rated) VALUES (?, ?, ?, 1)';
    mysqlcon.query(insertQuery, [userId, ratedUserId, rating], async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      // Update all entries in the answers table where user_id is equal to rated_user_id
      const updateAnswersQuery = 'UPDATE answers SET is_rated = 1 WHERE user_id = ?';
      mysqlcon.query(updateAnswersQuery, [ratedUserId], (err) => {
        if (err) {
          console.error(err);
        }
      });
      findUserRating(userId).then((newRating) => {
        mysqlcon.query(`UPDATE user_profiles SET rating = ? WHERE user_id = ?`, [newRating, userId], (err) => {
          if (err) {
            console.error(err);
          }
        })
      }).catch((err) => {
        console.error(err);
      });

      res.status(200).json({ message: 'Rating saved successfully.' });
    });
  });
}

// Utility function
const performRatingUpdate = async () => {
  const minRating = 0.5;
  const maxRating = 5.0;
  const step = 0.5;

  const users = await DBMODELS.user_profiles.findAll({ attributes: ['user_id'] });

  for (const user of users) {
    // Generate a random rating between minRating and maxRating, rounded to nearest step
    const randomSteps = Math.floor((maxRating - minRating) / step) + 1;
    const randomStep = Math.floor(Math.random() * randomSteps);
    const randomRating = minRating + randomStep * step;

    await DBMODELS.user_profiles.update(
      { rating: randomRating },
      { where: { user_id: user.user_id } }
    );
  }
};

// Express route handler
const updateRating = async (req, res) => {
  try {
    await performRatingUpdate();
    console.log("Ratings updated successfully.");
  } catch (err) {
    console.error(err);
  }
};



module.exports = {
  postUserRating,
  postRatingDirect,
  updateRating,
}