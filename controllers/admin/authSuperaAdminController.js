const bcrypt = require("bcrypt");
const { hashingPassword } = require("../../utils/validation");
const { mysqlcon } = require("../../model/db");

// VERIFY EMAIL FUNCTION
const VerifyEmail = async (req, res) => {
  try {
    const { email, role } = req.body;
    console.log("req.body is ", req.body);

    // 1️⃣ Validate input
    if (!email || !role) {
      return res
        .status(400)
        .json({ message: "Email and role are required" });
    }

    // 2️⃣ Determine table name based on role
    const tableName = role === "institute" ? "institutes" : "users";

    // 3️⃣ Build query condition based on role
    let query;
    let params;

    if (role === "institute") {
      // For institute, only check email
      query = `SELECT email FROM ${tableName} WHERE email = ?`;
      params = [email];
    } else {
      // For users (teacher, student, professional), check both email and role
      query = `SELECT email, role FROM ${tableName} WHERE email = ? AND role = ?`;
      params = [email, role];
    }

    // 4️⃣ Check if email exists with the specified role
    mysqlcon.query(query, params, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ message: "Email not found for the given role" });
      }

      // Email exists with the correct role
      return res.status(200).json({
        message: "Email verified successfully",
        email,
        role,
      });
    });
  } catch (error) {
    console.error("Verify Email Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// RESET PASSWORD FUNCTION
const ResetPassword = async (req, res) => {
  try {
    const { email, role, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !role || !password) {
      return res
        .status(400)
        .json({ message: "Email, role, and password are required" });
    }

    // 2️⃣ Determine table name based on role
    const tableName = role === "institute" ? "institutes" : "users";

    // 3️⃣ Build query condition based on role
    let selectQuery;
    let selectParams;

    if (role === "institute") {
      // For institute, only check email
      selectQuery = `SELECT * FROM ${tableName} WHERE email = ?`;
      selectParams = [email];
    } else {
      // For users (teacher, student, professional), check both email and role
      selectQuery = `SELECT * FROM ${tableName} WHERE email = ? AND role = ?`;
      selectParams = [email, role];
    }

    // 4️⃣ Check if email exists with the specified role
    mysqlcon.query(selectQuery, selectParams, async (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ message: "Email not found for the given role" });
      }

      // 5️⃣ Hash new password
      const hashedPassword = await hashingPassword(password);

      // 6️⃣ Build update query based on role
      let updateQuery;
      let updateParams;

      if (role === "institute") {
        // For institute, update by email only
        updateQuery = `UPDATE ${tableName} SET password = ? WHERE email = ?`;
        updateParams = [hashedPassword, email];
      } else {
        // For users, update by both email and role
        updateQuery = `UPDATE ${tableName} SET password = ? WHERE email = ? AND role = ?`;
        updateParams = [hashedPassword, email, role];
      }

      // 7️⃣ Update password
      mysqlcon.query(updateQuery, updateParams, (updateErr, updateResult) => {
        if (updateErr) {
          console.error("Password update error:", updateErr);
          return res
            .status(500)
            .json({ message: "Error updating password" });
        }

        return res.status(200).json({
          message: "Password reset successfully!",
          email,
          role,
        });
      });
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { VerifyEmail, ResetPassword };