require("dotenv").config();
const { mysqlcon } = require("../../model/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createJWT } = require("../../service/auth.service");
const sendEmailService = require("../../utils/email");
const sequelize = require("../../model/connection");
const { DataTypes } = require("sequelize");
const { hashingPassword } = require("../../utils/validation");
const admins = require("../../models/admins")(sequelize, DataTypes);
// const institutes = require("../../models/institutes")(sequelize, DataTypes)

const LocalStorage = require("node-localstorage").LocalStorage;
const localStorage = new LocalStorage("./scratch");
// Verify Token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token not provided." });

  jwt.verify(token, "secret_key", (err, decoded) => {
    if (err)
      return res.status(500).json({ message: "Failed to authenticate token." });

    req.user = decoded;
    next();
  });
};

// Authorize middleware
const authorize = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!requiredRole.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// Function to check if a superadmin already exists
// const checkSuperAdminExist = () => {
//   const query = "SELECT * FROM admins WHERE role = 'superadmin'";
//   return new Promise((resolve, reject) => {
//     mysqlcon.query(query, (error, results) => {
//       if (error) {
//         reject(error); // Reject with error if query fails
//       } else {
//         resolve(results.length > 0); // Resolve with true if results exist (superadmin exists)
//       }
//     });
//   });
// };
const checkSuperAdminExist = (email) => {
  const query = "SELECT * FROM admin WHERE email = ?";
  return new Promise((resolve, reject) => {
    mysqlcon.query(query, [email],(error, results) => {
      if (error) {
        reject(error); // Reject with error if query fails
      } else {
        resolve(results.length > 0); // Resolve with true if results exist (superadmin exists)
      }
    });
  });
};

// Function to create a superadmin
const createSuperAdmin = (username, email, password, role) => {
  const query =
    "INSERT INTO admins (username, email, password, role) VALUES (?, ?, ?, ?)";
  const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password securely
  return new Promise((resolve, reject) => {
    mysqlcon.query(
      query,
      [username, email, hashedPassword, role],
      (error, results) => {
        if (error) {
          reject(error); // Reject with error if query fails
        } else {
          resolve(results); // Resolve with the results of the insertion
        }
      }
    );
  });
};

// Signup controller function
const signup = async (req, res) => {
  const { username, email, password, role } = req.body; // Assuming these are parsed from request body
  // console.log("Singub Superadmin role ",req.body)
  try {
    // Check if a superadmin already exists
    const superadminExist = await checkSuperAdminExist(email);

    if (superadminExist) {
      return res.status(403).json({
        message: "Superadmin account already exists",
      });
    }

    // Create a new superadmin account
    await createSuperAdmin(username, email, password, role);

    res.json({ message: "Superadmin account created successfully" });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Register Controller
const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  // console.log("Register Admin Req.body is ",req.body)
  const existAdminQuery = "SELECT * FROM admins where email = ?";
  const query =
    "INSERT INTO admins (username, email, password, role) VALUES (?, ?, ?, ?)";
  try {
    const [existAdminResult] = await mysqlcon
      .promise()
      .query(existAdminQuery, [email]);
    if (existAdminResult.length > 0) {
      return res.status(403).json("This email of admin already exist");
    }
    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error." });
      }

      mysqlcon.query(
        query,
        [username, email, hashedPassword, role],
        (error) => {
          if (error) {
            console.log(error);
            return res.status(500).json({ message: "Internal server error." });
          }
          return res.status(200).json({ message: "Registration successful." });
        }
      );
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Login Controller
const login = async (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM admins WHERE email = ?";

  try {
    mysqlcon.query(query, [email], (error, results) => {
      if (error)
        return res.status(500).json({ message: "Internal server error." });

      if (results.length === 0) {
        return res
          .status(401)
          .json({ message: "Authentication failed. User not found." });
      }
      const user = results[0];
      bcrypt.compare(password, user.password, async (err, isMatch) => {
        if (err)
          return res.status(500).json({ message: "Internal server error." });
        if (!isMatch)
          return res
            .status(401)
            .json({ message: "Authentication failed. Wrong password." });

        const userdata = { id: user.id, email: user.email, role: user.role };
        const token = await createJWT(userdata);
        localStorage.setItem("userdata", JSON.stringify(userdata));
        localStorage.setItem({ token, user: userdata });
        res.status(200).json({ userdata, token });
      });
    });
  } catch (err) {
    console.log("This is error", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

//recover password
const RecoverPassword = async (req, res) => {
  const { email } = req.body;
  try {
    // Find the user by email
    const rows = await admins.findAll({ where: { email } });
    if (!rows) return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    // Generate a reset token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/auth/admin/reset?token=${token}`;

    // Prepare email template replacements
    const replacements = {
      name: user.username || "User", // Use the user's name if available
      resetUrl,
    };
    const mailConfig = {
      email: user.email,
      subject: "Reset Password",
    };

    // Send the recovery email
    await sendEmailService.sendTemplatedEmail(
      mailConfig,
      replacements,
      "RESET_PASSWORD"
    );

    res.status(200).json({ message: "Recovery email sent" });
  } catch (error) {
    console.error("Error sending recovery email:", error); // Log the error
    res.status(500).json({ message: "Error sending email" });
  }
};


//reset password
const ResetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // Verify the token and decode the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by ID
    const user = await admins.findOne({ where: { id: decoded.id } });

    if (!user) {
      return res.status(403).json({ message: "Invalid user" });
    }

    // Hash the new password
    const hashedPassword = await hashingPassword(newPassword);

    // Update the user's password
    await admins.update(
      { password: hashedPassword },
      { where: { id: user.id } }
    );

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.log("error from admin site ",error);
    if (error.name === "TokenExpiredError") {
      return res.status(403).send("Link is expired");
    }
    return res.status(500).json({ message: "Error resetting password" });
  }
};

// Protected routes
const admin = async (req, res) => {
  const { username, email, password } = req.body;
  const role = "admin";

  const query =
    "INSERT INTO admins(username,email,password,role) Values(?,?,?,?)";
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    mysqlcon.query(query, [username, email, hashedPassword, role], (error) => {
      if (error)
        return res.status(500).json({ message: "Internal Server Error" });
      res.json({ message: "Admin Account Created Successfully" });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const teacher = async (req, res) => {
  const { username, email, password } = req.body;
  const role = "teacher";

  const query =
    "INSERT INTO admins(username, email, password, role) Values(?,?,?,?)";
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    mysqlcon.query(query, [username, email, hashedPassword, role], (error) => {
      if (error)
        return res.status(500).json({ message: "Internal Server Error" });
      res.json({ message: "Teacher Account Created Successfully" });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const student = async (req, res) => {
  const { username, email, password } = req.body;
  const role = "student";

  const query =
    "INSERT INTO admins(username, email, password, role) Values(?,?,?,?)";
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    mysqlcon.query(query, [username, email, hashedPassword, role], (error) => {
      if (error)
        return res.status(500).json({ message: "Internal Server Error" });
      res.json({ message: "Student Account Created Successfully" });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  verifyToken,
  authorize,
  signup,
  login,
  register,
  admin,
  teacher,
  student,
  RecoverPassword,
  ResetPassword,
};
