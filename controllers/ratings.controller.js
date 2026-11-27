const { findUserRating } = require("../service/utilities.service");
const {
  normalizeStarRating,
  areUsersConnected,
  loadUserProviderRow,
  isRateableProvider,
  getLatestPairRating,
  cooldownRemainingDays,
  RATING_COOLDOWN_DAYS,
  queryAsync,
} = require("../service/ratingRules.service");
const { ensureRatingCommentColumn } = require("../utils/ensureRatingComment");

async function persistAverage(ratedUserId) {
  try {
    const newRating = await findUserRating(ratedUserId);
    await queryAsync(`UPDATE user_profiles SET rating = ? WHERE user_id = ?`, [
      newRating,
      ratedUserId,
    ]);
    await queryAsync(`UPDATE users SET rating = ? WHERE id = ?`, [
      newRating,
      ratedUserId,
    ]);
  } catch (err) {
    console.error("persistAverage:", err);
  }
}

function sanitizeComment(raw) {
  const text = String(raw || "").trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.slice(0, 300);
}

/**
 * Shared save: connection + rateable provider + one row per pair + 3-month cooldown.
 * Optional comment for look/feel reviews on profile.
 */
async function saveGyaniRating({ raterId, rateeId, rating, comment, answerMeta }) {
  if (!raterId || !rateeId) {
    return { status: 400, body: { error: "Missing rating fields." } };
  }
  if (String(raterId) === String(rateeId)) {
    return { status: 400, body: { error: "You cannot rate yourself." } };
  }

  const stars = normalizeStarRating(rating);
  if (stars == null) {
    return {
      status: 400,
      body: { error: "Rating must be between 0.5 and 5 in half-star steps." },
    };
  }

  const connected = await areUsersConnected(raterId, rateeId);
  if (!connected) {
    return {
      status: 403,
      body: { error: "You can only rate people you are connected with." },
    };
  }

  const ratee = await loadUserProviderRow(rateeId);
  if (!ratee || !isRateableProvider(ratee)) {
    return {
      status: 403,
      body: {
        error:
          "This user is not available for rating yet. Providers need subjects (and teaching classes for tutors).",
      },
    };
  }

  await ensureRatingCommentColumn();
  const note = sanitizeComment(comment);

  const existing = await getLatestPairRating(raterId, rateeId);
  if (existing) {
    const remaining = cooldownRemainingDays(
      existing.updatedAt || existing.createdAt
    );
    if (remaining > 0 && !note) {
      return {
        status: 429,
        body: {
          error: `You can update this rating in ${remaining} day${
            remaining === 1 ? "" : "s"
          }.`,
          remainingDays: remaining,
          cooldownDays: RATING_COOLDOWN_DAYS,
        },
      };
    }
    // Allow comment refresh during cooldown; rating value only if cooldown cleared
    if (remaining > 0) {
      await queryAsync(
        `UPDATE ratings SET comment = ?, updatedAt = NOW() WHERE id = ?`,
        [note, existing.id]
      );
    } else {
      await queryAsync(
        `UPDATE ratings
         SET rating = ?, comment = ?, is_rated = 1, updatedAt = NOW()
         WHERE id = ?`,
        [stars, note, existing.id]
      );
    }
  } else {
    await queryAsync(
      `INSERT INTO ratings (user_id, rated_user_id, rating, comment, is_rated)
       VALUES (?, ?, ?, ?, 1)`,
      [raterId, rateeId, stars, note]
    );
  }

  if (answerMeta?.answerId && answerMeta?.questionId) {
    await queryAsync(
      `UPDATE answers SET is_rated = 1
       WHERE id = ? AND question_id = ? AND user_id = ?`,
      [answerMeta.answerId, answerMeta.questionId, rateeId]
    );
  }

  await persistAverage(rateeId);
  return { status: 200, body: { message: "Rating saved successfully." } };
}

/** Public list of reviews (with comment) for a provider profile. */
const getProviderReviews = async (req, res) => {
  try {
    const rateeId = Number(req.params.userId);
    if (!rateeId) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    await ensureRatingCommentColumn();
    const rows = await queryAsync(
      `SELECT r.id, r.rating, r.comment, r.createdAt, r.updatedAt,
              u.id AS rater_id, u.first_name, u.last_name, u.username, u.avatar_url
       FROM ratings r
       INNER JOIN (
         SELECT user_id, rated_user_id, MAX(id) AS max_id
         FROM ratings
         WHERE rated_user_id = ?
         GROUP BY user_id, rated_user_id
       ) latest ON r.id = latest.max_id
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.rated_user_id = ?
         AND r.comment IS NOT NULL
         AND TRIM(r.comment) <> ''
       ORDER BY COALESCE(r.updatedAt, r.createdAt) DESC
       LIMIT 40`,
      [rateeId, rateeId]
    );
    return res.json({
      success: true,
      results: rows || [],
      count: (rows || []).length,
    });
  } catch (err) {
    console.error("getProviderReviews:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const postUserRating = async (req, res) => {
  try {
    const { questionId, answerId } = req.query;
    const { rating } = req.body;
    const userId = req.user?.id;

    if (!userId || !questionId || !answerId) {
      return res.status(400).json({ error: "Missing rating fields." });
    }

    const qRows = await queryAsync(
      `SELECT user_id FROM questions WHERE id = ? LIMIT 1`,
      [questionId]
    );
    if (!qRows.length || String(qRows[0].user_id) !== String(userId)) {
      return res
        .status(403)
        .json({ error: "You are not authorized to rate this answer." });
    }

    const aRows = await queryAsync(
      `SELECT user_id FROM answers WHERE id = ? LIMIT 1`,
      [answerId]
    );
    if (!aRows.length) {
      return res.status(404).json({ error: "Answer not found." });
    }

    const result = await saveGyaniRating({
      raterId: userId,
      rateeId: aRows[0].user_id,
      rating,
      answerMeta: { answerId, questionId },
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const postRatingDirect = async (req, res) => {
  try {
    const { rating, ratedUserId, comment } = req.body;
    // Identity from JWT only — ignore spoofable ?userId=
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await saveGyaniRating({
      raterId: userId,
      rateeId: ratedUserId,
      rating,
      comment,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/** Disabled: previously overwrote profile ratings with random values. */
const performRatingUpdate = async () => {
  console.log(
    "[ratings] Random profile rating cron is disabled — averages come from ratings table only."
  );
};

const updateRating = async () => {
  try {
    await performRatingUpdate();
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  postUserRating,
  postRatingDirect,
  getProviderReviews,
  updateRating,
  saveGyaniRating,
};
