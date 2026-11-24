/**
 * Monthly activity summary email (HTML table) for most-active users.
 * Trigger via admin route or: node -e "require('./utils/monthlyActivitySummary').runMonthlyActivitySummary()"
 */
const { mysqlcon } = require("../model/db");
const { sendEmailService } = require("./email");

const FROM = "noreply@eksathi.com";
const TOP_N = 50;

const monthWindow = () => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const endExclusive = new Date(end.getFullYear(), end.getMonth(), 1);
  const label = start.toLocaleString("en-IN", { month: "long", year: "numeric" });
  return { start, endExclusive, label };
};

const buildTableHtml = (rows, label) => {
  const body = rows
    .map(
      (r, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0">${i + 1}</td>
        <td style="padding:8px;border:1px solid #e2e8f0">${r.name || "Member"}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${r.questions}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${r.answers}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${r.messages}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center"><strong>${r.score}</strong></td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:Arial,sans-serif;color:#0d233e;max-width:640px">
    <h2 style="margin:0 0 8px">Your EkSathi monthly activity</h2>
    <p style="margin:0 0 16px;color:#64748b">Summary for <strong>${label}</strong>. You were among our most active members — thank you!</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">#</th>
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Member</th>
          <th style="padding:8px;border:1px solid #e2e8f0">Questions</th>
          <th style="padding:8px;border:1px solid #e2e8f0">Answers</th>
          <th style="padding:8px;border:1px solid #e2e8f0">Messages</th>
          <th style="padding:8px;border:1px solid #e2e8f0">Score</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#64748b">— EkSathi · eksathi.com</p>
  </div>`;
};

const fetchTopActiveUsers = async (start, endExclusive) => {
  // Soft scoring: questions + answers + outbound messages in the window
  const [rows] = await mysqlcon.promise().query(
    `
    SELECT u.id, u.email, u.first_name, u.last_name, u.username,
      COALESCE(q.cnt, 0) AS questions,
      COALESCE(a.cnt, 0) AS answers,
      COALESCE(m.cnt, 0) AS messages,
      (COALESCE(q.cnt, 0) * 3 + COALESCE(a.cnt, 0) * 2 + COALESCE(m.cnt, 0)) AS score
    FROM users u
    LEFT JOIN (
      SELECT user_id AS uid, COUNT(*) AS cnt FROM questions
      WHERE createdAt >= ? AND createdAt < ?
      GROUP BY user_id
    ) q ON q.uid = u.id
    LEFT JOIN (
      SELECT user_id AS uid, COUNT(*) AS cnt FROM answers
      WHERE createdAt >= ? AND createdAt < ?
      GROUP BY user_id
    ) a ON a.uid = u.id
    LEFT JOIN (
      SELECT sender_user_id AS uid, COUNT(*) AS cnt FROM messages
      WHERE createdAt >= ? AND createdAt < ? AND sender_user_id IS NOT NULL
      GROUP BY sender_user_id
    ) m ON m.uid = u.id
    WHERE u.email IS NOT NULL AND u.email != ''
      AND (COALESCE(q.cnt, 0) + COALESCE(a.cnt, 0) + COALESCE(m.cnt, 0)) > 0
    ORDER BY score DESC
    LIMIT ?
    `,
    [
      start,
      endExclusive,
      start,
      endExclusive,
      start,
      endExclusive,
      TOP_N,
    ]
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name:
      `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
      r.username ||
      "Member",
    questions: Number(r.questions) || 0,
    answers: Number(r.answers) || 0,
    messages: Number(r.messages) || 0,
    score: Number(r.score) || 0,
  }));
};

const runMonthlyActivitySummary = async () => {
  const { start, endExclusive, label } = monthWindow();
  const top = await fetchTopActiveUsers(start, endExclusive);
  if (!top.length) {
    return { sent: 0, label, message: "No active users in window" };
  }

  const tableHtml = buildTableHtml(top, label);
  let sent = 0;
  for (const user of top) {
    try {
      // Personalized note + full leaderboard table
      const html = tableHtml.replace(
        "You were among our most active members — thank you!",
        `Hi ${user.name}, you ranked in the top active members (score ${user.score}). Thank you!`
      );
      sendEmailService(
        user.email,
        `Your EkSathi activity summary — ${label}`,
        html,
        FROM
      );
      sent += 1;
    } catch (e) {
      console.error("monthly activity mail failed:", user.email, e?.message || e);
    }
  }
  return { sent, label, totalCandidates: top.length };
};

module.exports = {
  runMonthlyActivitySummary,
  fetchTopActiveUsers,
  monthWindow,
};
