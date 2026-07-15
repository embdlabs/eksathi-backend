const { DataTypes } = require("sequelize");
const sequelize = require("../../model/connection");
const {mysqlcon} = require("../../model/db");
const { hashingPassword } = require("../../utils/validation");
const { admins } = require("../../models/admins")(sequelize,DataTypes);
const upload = require("../../utils/upload");
const { imageReduce } = require("../../utils/upload");
const getAdmin = (req, res) => {
  try {
    mysqlcon.query(`SELECT * FROM admins`, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json({
            message: "Admin found",
            result
        });
    });
} catch (error) {
    console.error(err);
    return res.status(409).json({ message: "Something went wrong" });
}
};

const getAdminById = (req, res) => {
  const adminId = req.params.id;
  // Changed: Use 'id' instead of 'email' in WHERE clause
  const sql = `SELECT id, username, email, role, logo FROM admins WHERE id = ?`;
  
  try {
    mysqlcon.query(sql, [adminId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      
      // Check if admin exists
      if (result.length === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      // Return single admin object instead of array
      return res.status(200).json({
        message: "Admin found",
        data: result[0] // Return first (and only) result
      });
    });
  } catch (error) {
    // Fixed: Use 'error' instead of 'err' in catch block
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const createAdmin =async (req, res) => {
  const {
    username,
    email,
    role,
  } = req.body;
  // const logo = req.file
  
  if (
    !username ||
    // !logo ||
    !email ||
    !role
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  // // Check if the email already exists
  const [existingAdmin] = await mysqlcon.promise().query(`SELECT * FROM admins WHERE email = ?`, [email]);
  if (existingAdmin.length > 0) {
    return res.status(409).json({ message: "Email already exists" });
  }
  //hash the password
  const password =await hashingPassword(username)
  // const { filename, path: filePath } = logo;

   // Process the image with imageReducer
  //  const reducedFilePath = await imageReduce("200",filePath);
  const newUser = {
    username,
    password,
    email,
    role
  };
  mysqlcon.query(`INSERT INTO admins SET ?`, newUser, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    return res
      .status(201)
      .json({ message: "Admin created successfully", user_id: result.insertId });
  });
};

const updateAdmin = async (req, res) => {
  const userId = req.params.id;
  const { logo, username, email, role } = req.body;

  const updateData = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (logo) updateData.logo = logo;
  if(role) updateData.role = role;

  mysqlcon.query(
    `UPDATE admins SET ? WHERE id = ?`,
    [updateData, userId],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }

      return res.status(200).json({ message: "Admin updated successfully" });
    }
  );
};

const deleteAdmin = async (req, res) => {
  const userId = req.params.id;
  mysqlcon.query(`DELETE FROM admins WHERE id = ?`, [userId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.status(200).json({ message: "Admin deleted successfully" });
  });
};

// Function to update admin privileges
const updatePrivilege = async (req, res) => {
  const userId = req.params.id;
  const { privileges } = req.body;

  if (!userId || !privileges) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  const query = `UPDATE admins SET privileges = ? WHERE id = ?`;

  try {
    const [result] = await mysqlcon
      .promise()
      .query(query, [JSON.stringify(privileges), userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res
      .status(200)
      .json({ message: "Admin privileges updated successfully" });
  } catch (error) {
    console.error("Error updating admin privileges:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getPrivilege = async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "Missing user ID parameter" });
  }

  const query = `SELECT privileges FROM admins WHERE id = ?`;

  try {
    const [rows] = await mysqlcon
      .promise()
      .query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res
      .status(200)
      .json({ 
        privileges: rows[0].privileges 
      });
  } catch (error) {
    console.error("Error fetching admin privileges:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
    getAdmin,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    updatePrivilege,
    getAdminById,
    getPrivilege
}