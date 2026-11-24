/**
 * Lightweight transactional emails (noreply@eksathi.com).
 * Failures are logged only — never block the main request.
 */
const { sendEmailService } = require("./email");
const { mysqlcon } = require("../model/db");

const FROM = "noreply@eksathi.com";

const wrap = (title, bodyHtml) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0d233e;max-width:560px">
    <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:24px;font-size:12px;color:#64748b">
      — EkSathi · <a href="https://eksathi.com">eksathi.com</a>
    </p>
  </div>
`;

const safeSend = (to, subject, html) => {
  if (!to) return;
  try {
    sendEmailService(to, subject, html, FROM);
  } catch (e) {
    console.error("transactional mail failed:", subject, e?.message || e);
  }
};

/** Contact Us form auto-ack to the submitter */
const sendContactUsAck = ({ email, name }) => {
  const who = name ? String(name).trim() : "there";
  safeSend(
    email,
    "We received your message — EkSathi",
    wrap(
      "Thanks for contacting us",
      `<p>Hi ${who},</p>
       <p>We have received your message and will get back to you soon.</p>
       <p>If you need urgent help, email <a href="mailto:support@eksathi.com">support@eksathi.com</a>.</p>`
    )
  );
};

/** Job application confirmation to the candidate */
const sendJobApplicationAck = ({ email, name, jobTitle }) => {
  const who = name ? String(name).trim() : "there";
  const job = jobTitle ? String(jobTitle).trim() : "the role";
  safeSend(
    email,
    "Application received — EkSathi",
    wrap(
      "Application received",
      `<p>Hi ${who},</p>
       <p>Your application for <strong>${job}</strong> was submitted successfully.</p>
       <p>The employer may contact you directly. EkSathi does not process interview or salary payments between users.</p>`
    )
  );
};

/** Report / abuse submission ack */
const sendReportAck = ({ email, name }) => {
  const who = name ? String(name).trim() : "there";
  safeSend(
    email,
    "Report received — EkSathi",
    wrap(
      "We received your report",
      `<p>Hi ${who},</p>
       <p>Thank you for reporting. Our team will review it. We may not reply to every report, but we take safety seriously.</p>`
    )
  );
};

/**
 * Profile incomplete reminder (max once per 14 days).
 * Uses notifications table for rate-limit — no schema change.
 */
const maybeSendIncompleteProfileReminder = async (userId, percent) => {
  try {
    if (!userId || percent == null || Number(percent) >= 50) return;

    const [recent] = await mysqlcon.promise().query(
      `SELECT id FROM notifications
       WHERE receiver_user_id = ?
         AND message LIKE 'Complete your EkSathi profile%'
         AND createdAt > DATE_SUB(NOW(), INTERVAL 14 DAY)
       LIMIT 1`,
      [userId]
    );
    if (recent.length) return;

    const [users] = await mysqlcon.promise().query(
      `SELECT email, first_name, last_name FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = users[0];
    if (!user?.email) return;

    const name =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || "there";
    const msg = `Complete your EkSathi profile (${Math.round(percent)}% done)`;

    await mysqlcon.promise().query(
      `INSERT INTO notifications
        (sender_user_id, receiver_user_id, notification_type, content_id, message)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, userId, 9, null, msg]
    );

    safeSend(
      user.email,
      "Complete your EkSathi profile",
      wrap(
        "Your profile needs a few more details",
        `<p>Hi ${name},</p>
         <p>Your profile is about <strong>${Math.round(percent)}%</strong> complete.
         A fuller profile helps tutors, institutes, and peers find you.</p>
         <p><a href="https://eksathi.com/profile">Update your profile</a></p>`
      )
    );
  } catch (e) {
    console.error("incomplete profile reminder:", e?.message || e);
  }
};

module.exports = {
  sendContactUsAck,
  sendJobApplicationAck,
  sendReportAck,
  maybeSendIncompleteProfileReminder,
};
