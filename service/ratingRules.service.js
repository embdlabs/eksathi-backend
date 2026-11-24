/**
 * Gyani rating + dual-teaching provider rules (shared helpers).
 * offers_teaching: student stays role=student; flag marks tutor dual-role.
 */
const { mysqlcon } = require("../model/db");

const RATING_COOLDOWN_DAYS = 90; // ~3 months
const DAY_MS = 24 * 60 * 60 * 1000;

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    mysqlcon.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

/** Local-only ensure: add offers_teaching if missing (no formal migration). */
async function ensureOffersTeachingColumn() {
  try {
    const rows = await queryAsync(
      `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_profiles'
         AND COLUMN_NAME = 'offers_teaching'`
    );
    if (Number(rows?.[0]?.c) === 0) {
      await queryAsync(
        `ALTER TABLE user_profiles
         ADD COLUMN offers_teaching TINYINT(1) NOT NULL DEFAULT 0
         AFTER teachAllSubjects`
      );
      console.log("[ratingRules] Added user_profiles.offers_teaching");
    }
  } catch (err) {
    console.error("[ratingRules] ensureOffersTeachingColumn:", err.message);
  }
}

function parseList(raw) {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "object") return parseList(Object.values(raw));
  const text = String(raw).trim();
  if (!text || text === "null" || text === "[]") return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) || typeof parsed === "object") return parseList(parsed);
  } catch {
    /* comma list */
  }
  return text
    .split(/[,|]/)
    .map((t) => t.replace(/^["'\s[\]]+|["'\s[\]]+$/g, "").trim())
    .filter(Boolean);
}

function flagOn(v) {
  return v === true || v === 1 || v === "1" || v === "true";
}

/** Has teachable subjects (selectedSubjects / users.subject / skills). */
function hasTeachableSubjects(row) {
  if (parseList(row?.selectedSubjects).length) return true;
  if (parseList(row?.subject).length) return true;
  if (parseList(row?.skills).length) return true;
  return false;
}

/** Teaching class scope (teachers + dual students). */
function hasTeachingClasses(row) {
  if (flagOn(row?.teachAllSubjects)) return true;
  return parseList(row?.teachingClasses).length > 0;
}

function isProviderRole(row) {
  const role = String(row?.role || "").toLowerCase();
  if (role === "teacher" || role === "professional" || role === "educator") {
    return true;
  }
  if (role === "student" && flagOn(row?.offers_teaching)) return true;
  return false;
}

/** Soft-block: providers need subjects; teachers/dual also need teaching classes. */
function hasProviderListingProfile(row) {
  if (!isProviderRole(row)) return false;
  if (!hasTeachableSubjects(row)) return false;
  const role = String(row?.role || "").toLowerCase();
  if (role === "professional") return true;
  return hasTeachingClasses(row);
}

function isRateableProvider(row) {
  return hasProviderListingProfile(row);
}

function ribbonRoleLabel(row) {
  const role = String(row?.role || "").toLowerCase();
  if (role === "teacher" || role === "educator") return "Tutor";
  if (role === "professional") return "Pro";
  if (role === "student" && flagOn(row?.offers_teaching)) return "Tutor";
  if (role === "student") return "Student";
  if (role === "institute") return "Inst";
  return role ? role.slice(0, 8) : "User";
}

function normalizeStarRating(rating) {
  const n = Number(rating);
  if (!Number.isFinite(n)) return null;
  if (n < 0.5 || n > 5) return null;
  const stepped = Math.round(n * 2) / 2;
  return stepped;
}

function cooldownRemainingDays(fromDate) {
  if (!fromDate) return 0;
  const then = new Date(fromDate).getTime();
  if (!Number.isFinite(then)) return 0;
  const elapsed = Date.now() - then;
  const left = RATING_COOLDOWN_DAYS * DAY_MS - elapsed;
  if (left <= 0) return 0;
  return Math.max(1, Math.ceil(left / DAY_MS));
}

async function areUsersConnected(userA, userB) {
  const rows = await queryAsync(
    `SELECT id FROM connections
     WHERE status = 'accepted'
       AND (
         (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
       )
     LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return rows.length > 0;
}

async function loadUserProviderRow(userId) {
  const rows = await queryAsync(
    `SELECT u.id, u.role, u.subject,
            up.offers_teaching, up.selectedSubjects, up.teachingClasses,
            up.teachAllSubjects,
            COALESCE((
              SELECT GROUP_CONCAT(DISTINCT CAST(s.skill_name AS CHAR) SEPARATOR ', ')
              FROM skills s WHERE s.user_id = u.id
            ), '') AS skills
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getLatestPairRating(raterId, rateeId) {
  const rows = await queryAsync(
    `SELECT id, rating, createdAt, updatedAt
     FROM ratings
     WHERE user_id = ? AND rated_user_id = ?
     ORDER BY COALESCE(updatedAt, createdAt) DESC, id DESC
     LIMIT 1`,
    [raterId, rateeId]
  );
  return rows[0] || null;
}

/** SQL: user is a provider (teacher/pro/dual). */
const SQL_IS_PROVIDER = `(
  u.role IN ('teacher', 'professional', 'educator')
  OR (u.role = 'student' AND COALESCE(up.offers_teaching, 0) = 1)
)`;

/** SQL: has teachable subjects. */
const SQL_HAS_SUBJECTS = `(
  (
    up.selectedSubjects IS NOT NULL
    AND TRIM(CAST(up.selectedSubjects AS CHAR)) NOT IN ('', 'null', '[]')
  )
  OR (
    u.subject IS NOT NULL
    AND TRIM(CAST(u.subject AS CHAR)) NOT IN ('', 'null', '[]')
  )
  OR EXISTS (SELECT 1 FROM skills s WHERE s.user_id = u.id LIMIT 1)
)`;

/** SQL: teaching class scope. */
const SQL_HAS_TEACHING_CLASSES = `(
  COALESCE(up.teachAllSubjects, 0) = 1
  OR (
    up.teachingClasses IS NOT NULL
    AND TRIM(CAST(up.teachingClasses AS CHAR)) NOT IN ('', 'null', '[]')
  )
)`;

/** Complete provider for tutor search / rateable. */
const SQL_COMPLETE_PROVIDER = `(
  ${SQL_IS_PROVIDER}
  AND ${SQL_HAS_SUBJECTS}
  AND (
    u.role = 'professional'
    OR ${SQL_HAS_TEACHING_CLASSES}
  )
)`;

/**
 * Experts listing visibility:
 * - pure students always
 * - dual incomplete: only as students (when student filter / all)
 * - complete providers when teacher/pro/dual listing applies
 */
/** Public member roles only — never admin / superadmin / institute in search. */
const PUBLIC_MEMBER_ROLES = ["student", "teacher", "professional"];
const SQL_PUBLIC_USER_ROLE = `LOWER(COALESCE(u.role, '')) IN ('student', 'teacher', 'professional')`;
const SQL_PUBLIC_USER_ROLE_BARE = `LOWER(COALESCE(role, '')) IN ('student', 'teacher', 'professional')`;

function buildExpertsRoleVisibilitySql({ teacher, professional, student }) {
  const t = teacher === "true";
  const p = professional === "true";
  const s = student === "true";
  const any = t || p || s;

  if (!any) {
    // Default All: pure students + complete providers (incl. dual)
    return ` AND (
      (u.role = 'student' AND COALESCE(up.offers_teaching, 0) = 0)
      OR ${SQL_COMPLETE_PROVIDER}
    )`;
  }

  const parts = [];
  if (s) {
    // Students filter includes dual (even incomplete) — no duplicate rows
    parts.push(`(u.role = 'student')`);
  }
  if (t) {
    parts.push(`(
      (u.role = 'teacher' OR (u.role = 'student' AND COALESCE(up.offers_teaching, 0) = 1))
      AND ${SQL_HAS_SUBJECTS}
      AND ${SQL_HAS_TEACHING_CLASSES}
    )`);
  }
  if (p) {
    parts.push(`(u.role = 'professional' AND ${SQL_HAS_SUBJECTS})`);
  }
  return ` AND (${parts.join(" OR ")})`;
}

module.exports = {
  RATING_COOLDOWN_DAYS,
  ensureOffersTeachingColumn,
  parseList,
  flagOn,
  hasTeachableSubjects,
  hasTeachingClasses,
  isProviderRole,
  hasProviderListingProfile,
  isRateableProvider,
  ribbonRoleLabel,
  normalizeStarRating,
  cooldownRemainingDays,
  areUsersConnected,
  loadUserProviderRow,
  getLatestPairRating,
  queryAsync,
  SQL_IS_PROVIDER,
  SQL_HAS_SUBJECTS,
  SQL_HAS_TEACHING_CLASSES,
  SQL_COMPLETE_PROVIDER,
  PUBLIC_MEMBER_ROLES,
  SQL_PUBLIC_USER_ROLE,
  SQL_PUBLIC_USER_ROLE_BARE,
  buildExpertsRoleVisibilitySql,
};
