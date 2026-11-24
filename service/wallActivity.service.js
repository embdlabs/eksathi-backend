/**
 * Lightweight Wall (Forum) activity posts — LinkedIn-style engagement blurbs.
 * Writes into `questions` with isPost=1 + notification type. Never fails the caller.
 * Keeps copy privacy-safe: celebrate intent, not confidential details.
 */

const { mysqlcon } = require("../model/db");

const slugify = (text) =>
  String(text || "activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

const capitalizeNamePart = (value) => {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const displayName = async (userId) => {
  try {
    const [rows] = await mysqlcon.promise().query(
      `SELECT first_name, last_name, username
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const row = rows[0];
    if (!row) return "A member";
    const full = [capitalizeNamePart(row.first_name), capitalizeNamePart(row.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full || row.username || "A member";
  } catch {
    return "A member";
  }
};

const userLite = async (userId) => {
  try {
    const [rows] = await mysqlcon.promise().query(
      `SELECT id, first_name, last_name, username
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const row = rows[0];
    if (!row) return { id: userId, name: "A member", username: null };
    const full = [capitalizeNamePart(row.first_name), capitalizeNamePart(row.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim();
    return {
      id: row.id,
      name: full || row.username || "A member",
      username: row.username || null,
    };
  } catch {
    return { id: userId, name: "A member", username: null };
  }
};

const recentlyPosted = async (userId, notification, withinHours = 24) => {
  try {
    const [rows] = await mysqlcon.promise().query(
      `SELECT id FROM questions
       WHERE user_id = ? AND notification = ? AND createdAt >= (NOW() - INTERVAL ? HOUR)
       LIMIT 1`,
      [userId, notification, withinHours]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
};

/**
 * @param {object} opts
 * @param {number|string} opts.userId
 * @param {string} opts.notification - discriminator string
 * @param {string} opts.title
 * @param {string} opts.brief - short wall card text
 * @param {string} [opts.body]
 * @param {object|array} [opts.tags]
 * @param {number} [opts.throttleHours] - skip if same type posted recently (default 0 = no throttle)
 */
const postWallActivity = async ({
  userId,
  notification,
  title,
  brief,
  body,
  tags = {},
  throttleHours = 0,
}) => {
  if (!userId || !notification || !title) return null;
  try {
    if (throttleHours > 0 && (await recentlyPosted(userId, notification, throttleHours))) {
      return null;
    }

    const slug = `${slugify(notification)}-${userId}-${Date.now()}`;
    const tagJson = JSON.stringify({
      ...tags,
      wall: true,
      type: notification,
    });

    const [result] = await mysqlcon.promise().query(
      `INSERT INTO questions
        (title, slug, tags, body, brief, isPost, notification, is_answered, user_id, is_hidden, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, ?, 'open', ?, 0, NOW(), NOW())`,
      [
        title.slice(0, 250),
        slug,
        tagJson,
        body || brief || title,
        (brief || title).slice(0, 500),
        notification.slice(0, 50),
        userId,
      ]
    );
    return result.insertId;
  } catch (err) {
    console.error("wallActivity post failed:", notification, err?.message || err);
    return null;
  }
};

const personTags = (lite, achievement) => ({
  achievement,
  userId: lite.id,
  nameA: lite.name,
  usernameA: lite.username,
  name: lite.name,
  username: lite.username,
});

const congratulateCertificate = async (userId) => {
  const lite = await userLite(userId);
  const name = lite.name;
  return postWallActivity({
    userId,
    notification: "certificate_added",
    title: `Congratulations ${name}!`,
    brief: `Congratulations ${name} for earning a new certificate! View profile for more details.`,
    body: `Congratulations ${name} for earning a new certificate! Celebrate this achievement — view their profile for more details.`,
    tags: personTags(lite, "certificate"),
  });
};

const congratulateEducation = async (userId, { completed = false } = {}) => {
  const lite = await userLite(userId);
  const name = lite.name;
  if (completed) {
    return postWallActivity({
      userId,
      notification: "education_completed",
      title: `Congratulations ${name}!`,
      brief: `Congratulations ${name} for completing their education milestone! View profile for more details.`,
      body: `Congratulations ${name} for completing an education milestone. View profile for more details.`,
      tags: personTags(lite, "education_completed"),
    });
  }
  return postWallActivity({
    userId,
    notification: "education_added",
    title: `${name} added new studies`,
    brief: `New studies added by ${name}. Congratulations — view profile for more details.`,
    body: `${name} added a new education entry. View profile for more details.`,
    tags: personTags(lite, "education"),
  });
};

const congratulateSkill = async (userId) => {
  const lite = await userLite(userId);
  const name = lite.name;
  return postWallActivity({
    userId,
    notification: "skill_added",
    title: `${name} leveled up skills`,
    brief: `${name} added new skills to their profile. View profile for more details.`,
    tags: personTags(lite, "skill"),
    throttleHours: 12,
  });
};

const congratulateExperience = async (userId, { isUpdate = false } = {}) => {
  const lite = await userLite(userId);
  const name = lite.name;
  if (isUpdate) {
    return postWallActivity({
      userId,
      notification: "experience_updated",
      title: `${name} updated their experience`,
      brief: `${name} updated their work experience. View profile for more details.`,
      tags: personTags(lite, "experience"),
      throttleHours: 12,
    });
  }
  return postWallActivity({
    userId,
    notification: "experience_added",
    title: `${name} added new experience`,
    brief: `${name} added a new work experience. View profile for more details.`,
    tags: personTags(lite, "experience"),
  });
};

const congratulateResearch = async (userId, { isUpdate = false } = {}) => {
  const lite = await userLite(userId);
  const name = lite.name;
  if (isUpdate) {
    return postWallActivity({
      userId,
      notification: "research_updated",
      title: `${name} updated their research`,
      brief: `${name} updated a research entry. View profile for more details.`,
      tags: personTags(lite, "research"),
      throttleHours: 12,
    });
  }
  return postWallActivity({
    userId,
    notification: "research_added",
    title: `${name} shared new research`,
    brief: `${name} added new research to their profile. View profile for more details.`,
    tags: personTags(lite, "research"),
  });
};

const congratulateAward = async (userId, { isUpdate = false } = {}) => {
  const lite = await userLite(userId);
  const name = lite.name;
  if (isUpdate) {
    return postWallActivity({
      userId,
      notification: "award_updated",
      title: `${name} updated an award`,
      brief: `${name} updated an award on their profile. View profile for more details.`,
      tags: personTags(lite, "award"),
      throttleHours: 12,
    });
  }
  return postWallActivity({
    userId,
    notification: "award_added",
    title: `Congratulations ${name}!`,
    brief: `Congratulations ${name} for a new award! View profile for more details.`,
    body: `Congratulations ${name} for earning a new award. View profile for more details.`,
    tags: personTags(lite, "award"),
  });
};

const announceProfileUpdate = async (userId) => {
  // New accounts already have a Welcome wall post — skip noisy "profile updated"
  if (await recentlyPosted(userId, "new_user_registration", 24 * 7)) {
    return null;
  }
  const lite = await userLite(userId);
  const name = lite.name;
  return postWallActivity({
    userId,
    notification: "profile_updated",
    title: `${name} updated their profile`,
    brief: `${name} updated their profile. View profile for more details.`,
    tags: personTags(lite, "profile"),
    throttleHours: 24,
  });
};

const announceAnswer = async (userId, { questionTitle, questionSlug, questionId } = {}) => {
  const lite = await userLite(userId);
  const name = lite.name;
  const qLabel = questionTitle
    ? `"${String(questionTitle).slice(0, 80)}"`
    : "a question";
  return postWallActivity({
    userId,
    notification: "answer_posted",
    title: `${name} answered ${qLabel}`,
    brief: `${qLabel} was answered by ${name}. Open the discussion to read more.`,
    body: `${name} shared an answer on ${qLabel}. Join the conversation.`,
    tags: {
      ...personTags(lite, "answer"),
      questionId: questionId || null,
      questionSlug: questionSlug || null,
    },
  });
};

const announceConnection = async (userId, otherUserId) => {
  const [a, b] = await Promise.all([userLite(userId), userLite(otherUserId)]);
  return postWallActivity({
    userId,
    notification: "connection_established",
    title: `${a.name} & ${b.name} are connected now`,
    brief: `${a.name} and ${b.name} are connected now. Grow your network — view their profiles.`,
    body: `${a.name} and ${b.name} are connected now on EkSathi.`,
    tags: {
      achievement: "connection",
      otherUserId,
      userId,
      nameA: a.name,
      nameB: b.name,
      usernameA: a.username,
      usernameB: b.username,
    },
  });
};

const announceBirthday = async (userId) => {
  const lite = await userLite(userId);
  const name = lite.name;
  return postWallActivity({
    userId,
    notification: "birthday",
    title: `Happy Birthday ${name}!`,
    brief: `Wish ${name} a happy birthday! View profile to send your wishes.`,
    tags: personTags(lite, "birthday"),
    throttleHours: 20,
  });
};

/**
 * LinkedIn-style: "User XYZ liked this" with original post nested via tags.
 * Skips self-likes, answer votes, and likes on other like-activity posts.
 */
const announcePostLiked = async (likerUserId, questionId) => {
  if (!likerUserId || !questionId) return null;
  try {
    const [rows] = await mysqlcon.promise().query(
      `SELECT q.id, q.title, q.brief, q.body, q.slug, q.notification, q.user_id AS author_id,
              u.first_name, u.last_name, u.username
       FROM questions q
       LEFT JOIN users u ON u.id = q.user_id
       WHERE q.id = ? LIMIT 1`,
      [questionId]
    );
    const q = rows[0];
    if (!q) return null;
    if (String(q.author_id) === String(likerUserId)) return null;
    if (String(q.notification || "") === "post_liked") return null;

    // One wall blurb per liker + original post (tags may be TEXT/JSON)
    const [dup] = await mysqlcon.promise().query(
      `SELECT id FROM questions
       WHERE user_id = ? AND notification = 'post_liked'
         AND (
           tags LIKE ? OR tags LIKE ? OR tags LIKE ?
         )
       LIMIT 1`,
      [
        likerUserId,
        `%"originalQuestionId":${Number(questionId)}%`,
        `%"originalQuestionId":"${Number(questionId)}"%`,
        `%"originalQuestionId": ${Number(questionId)}%`,
      ]
    );
    if (dup.length > 0) return null;

    const liker = await userLite(likerUserId);
    const authorFull = [capitalizeNamePart(q.first_name), capitalizeNamePart(q.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim();
    const authorName = authorFull || q.username || "a member";
    const snippet =
      String(q.brief || q.title || q.body || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220) || "a post";

    return postWallActivity({
      userId: likerUserId,
      notification: "post_liked",
      title: `${liker.name} liked this`,
      brief: snippet,
      body: snippet,
      tags: {
        ...personTags(liker, "like"),
        originalQuestionId: q.id,
        originalSlug: q.slug || null,
        originalTitle: q.title || null,
        originalBrief: q.brief || null,
        originalBody: q.body || null,
        originalNotification: q.notification || null,
        originalAuthorId: q.author_id,
        originalAuthorName: authorName,
        originalAuthorUsername: q.username || null,
      },
    });
  } catch (err) {
    console.error("announcePostLiked failed:", err?.message || err);
    return null;
  }
};

/** Call on login / profile load — posts at most once per day if DOB is today. */
const maybeAnnounceBirthday = async (userId) => {
  if (!userId) return null;
  try {
    const [rows] = await mysqlcon.promise().query(
      `SELECT dob FROM user_profiles WHERE user_id = ? AND dob IS NOT NULL LIMIT 1`,
      [userId]
    );
    const dob = rows[0]?.dob;
    if (!dob) return null;
    const d = new Date(dob);
    const now = new Date();
    if (d.getUTCMonth() !== now.getMonth() || d.getUTCDate() !== now.getDate()) {
      return null;
    }
    return announceBirthday(userId);
  } catch {
    return null;
  }
};

module.exports = {
  postWallActivity,
  congratulateCertificate,
  congratulateEducation,
  congratulateSkill,
  congratulateExperience,
  congratulateResearch,
  congratulateAward,
  announceProfileUpdate,
  announceAnswer,
  announceConnection,
  announceBirthday,
  maybeAnnounceBirthday,
  announcePostLiked,
  displayName,
};
