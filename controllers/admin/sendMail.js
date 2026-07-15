const { mysqlcon } = require("../../model/db");
const { sendDynamicEmail } = require("../../utils/email");

const sendMailByRole = async (req, res) => {
  let { role, message, subject,template } = req.body;
  console.log("req.body is ", req.body);

  if (!role) {
    return res
      .status(400)
      .json({ success: false, message: "Role is required" });
  }

  // Ensure role is always an array
  if (!Array.isArray(role)) {
    role = [role];
  }

  // Validate all roles are valid
  const validRoles = ["student", "teacher", "professional"];
  const invalidRoles = role.filter(r => !validRoles.includes(r) && r !== "institute");
  
  if (invalidRoles.length > 0) {
    return res
      .status(400)
      .json({ success: false, message: `Invalid role(s): ${invalidRoles.join(", ")}` });
  }

  try {
    let allResults = [];

    // Process each role
    for (const currentRole of role) {
      const results = await new Promise((resolve, reject) => {
        let query;
        let queryParams = [];

        // Check which table and fields to query based on role
        if (["student", "teacher", "professional"].includes(currentRole)) {
          query = `
            SELECT first_name, last_name, role, email, username
            FROM users
            WHERE role = ?
          `;
          queryParams = [currentRole];
        } else if (currentRole === "institute") {
          query = `
            SELECT name, email, username
            FROM institutes
          `;
        } else {
          return reject(new Error("Invalid role provided"));
        }

        // Run query
        mysqlcon.query(query, queryParams, (err, results) => {
          if (err) {
            console.error("Database query error:", err);
            return reject(err);
          }
          resolve(results || []);
        });
      });

      allResults = allResults.concat(results);
    }

    if (allResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found for the given role(s)",
      });
    }

    // Send emails to all users
    try {
      const emailPromises = allResults.map((user) => {
        console.log("Sending email to user:", user);
        return sendDynamicEmail(user.email, user.username, role, message, subject,template);
      });

      // Wait for all emails to be sent
      await Promise.all(emailPromises);

      // Return success response
      return res.status(200).json({
        success: true,
        role,
        message: `Emails sent successfully to ${allResults.length} user(s)`,
        count: allResults.length,
      });
    } catch (emailError) {
      console.error("Error sending emails:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send some emails",
      });
    }
  } catch (error) {
    console.error("Error in sendMailByRole:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  sendMailByRole,
};