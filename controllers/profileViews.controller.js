const { mysqlcon } = require("../model/db");
const { ensureProfileViewsTables } = require("../utils/ensureProfileViews");

const getPrefs = async (userId) => {
  const [rows] = await mysqlcon.promise().query(
    `SELECT show_viewers, anonymous_browsing FROM profile_view_prefs WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    return { show_viewers: 1, anonymous_browsing: 0 };
  }
  return rows[0];
};

/** Record a profile view (skip self). Honors viewer's anonymous_browsing. */
const recordProfileView = async (req, res) => {
  try {
    await ensureProfileViewsTables();
    const viewedId = Number(req.params.userId);
    const viewerId = Number(req.body?.viewerId || req.user?.id);
    if (!viewedId || !viewerId || viewedId === viewerId) {
      return res.status(200).json({ recorded: false });
    }

    const viewerPrefs = await getPrefs(viewerId);
    if (viewerPrefs.anonymous_browsing) {
      // Still count anonymously? LinkedIn private mode doesn't show identity.
      // We skip recording entirely when anonymous.
      return res.status(200).json({ recorded: false, anonymous: true });
    }

    // One row per viewer→viewed: bump createdAt so they move to top of the list
    const [existing] = await mysqlcon.promise().query(
      `SELECT id FROM profile_views
       WHERE viewer_id = ? AND viewed_id = ?
       ORDER BY createdAt DESC`,
      [viewerId, viewedId]
    );
    if (existing.length) {
      const keepId = existing[0].id;
      await mysqlcon.promise().query(
        `UPDATE profile_views SET createdAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [keepId]
      );
      if (existing.length > 1) {
        const dropIds = existing.slice(1).map((r) => r.id);
        await mysqlcon.promise().query(
          `DELETE FROM profile_views WHERE id IN (?)`,
          [dropIds]
        );
      }
      return res.status(200).json({ recorded: true, updated: true });
    }

    await mysqlcon.promise().query(
      `INSERT INTO profile_views (viewer_id, viewed_id) VALUES (?, ?)`,
      [viewerId, viewedId]
    );
    return res.status(201).json({ recorded: true });
  } catch (err) {
    console.error("recordProfileView:", err?.message || err);
    return res.status(500).json({ message: "Could not record view" });
  }
};

/** Owner: view count + recent viewers (if show_viewers enabled). */
const getProfileViews = async (req, res) => {
  try {
    await ensureProfileViewsTables();
    const userId = Number(req.params.userId);
    const requesterId = Number(req.query.requesterId || req.user?.id);
    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const prefs = await getPrefs(userId);
    const [countRows] = await mysqlcon.promise().query(
      `SELECT COUNT(DISTINCT viewer_id) AS total FROM profile_views WHERE viewed_id = ?`,
      [userId]
    );
    const total = countRows[0]?.total || 0;

    const isOwner = requesterId && String(requesterId) === String(userId);
    if (!isOwner || !prefs.show_viewers) {
      return res.status(200).json({
        total,
        viewers: [],
        show_viewers: Boolean(prefs.show_viewers),
        anonymous_browsing: Boolean(prefs.anonymous_browsing),
      });
    }

    // Latest view per viewer, newest first (sequential bump order)
    const [viewers] = await mysqlcon.promise().query(
      `SELECT pv.viewer_id AS id, pv.createdAt AS viewed_at,
              u.username, u.first_name, u.last_name, u.avatar_url, u.role
       FROM profile_views pv
       JOIN users u ON u.id = pv.viewer_id
       INNER JOIN (
         SELECT viewer_id, MAX(createdAt) AS max_at
         FROM profile_views
         WHERE viewed_id = ?
         GROUP BY viewer_id
       ) latest ON latest.viewer_id = pv.viewer_id AND latest.max_at = pv.createdAt
       WHERE pv.viewed_id = ?
       ORDER BY pv.createdAt DESC
       LIMIT 100`,
      [userId, userId]
    );

    return res.status(200).json({
      total,
      viewers,
      show_viewers: true,
      anonymous_browsing: Boolean(prefs.anonymous_browsing),
    });
  } catch (err) {
    console.error("getProfileViews:", err?.message || err);
    return res.status(500).json({ message: "Could not load views" });
  }
};

const updateProfileViewPrefs = async (req, res) => {
  try {
    await ensureProfileViewsTables();
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }
    const show_viewers =
      req.body.show_viewers === false || req.body.show_viewers === 0 ? 0 : 1;
    const anonymous_browsing =
      req.body.anonymous_browsing === true || req.body.anonymous_browsing === 1
        ? 1
        : 0;

    await mysqlcon.promise().query(
      `INSERT INTO profile_view_prefs (user_id, show_viewers, anonymous_browsing)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         show_viewers = VALUES(show_viewers),
         anonymous_browsing = VALUES(anonymous_browsing)`,
      [userId, show_viewers, anonymous_browsing]
    );

    return res.status(200).json({
      message: "Profile view preferences updated",
      show_viewers: Boolean(show_viewers),
      anonymous_browsing: Boolean(anonymous_browsing),
    });
  } catch (err) {
    console.error("updateProfileViewPrefs:", err?.message || err);
    return res.status(500).json({ message: "Could not update preferences" });
  }
};

const getProfileViewPrefs = async (req, res) => {
  try {
    await ensureProfileViewsTables();
    const userId = Number(req.params.userId);
    const prefs = await getPrefs(userId);
    return res.status(200).json({
      show_viewers: Boolean(prefs.show_viewers),
      anonymous_browsing: Boolean(prefs.anonymous_browsing),
    });
  } catch (err) {
    return res.status(500).json({ message: "Could not load preferences" });
  }
};

module.exports = {
  recordProfileView,
  getProfileViews,
  updateProfileViewPrefs,
  getProfileViewPrefs,
};
