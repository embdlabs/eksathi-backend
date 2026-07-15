require("dotenv").config();
const { endpoint } = require("../..");
const { mysqlcon } = require("../../model/db");
const nodemailer = require("nodemailer");
const { createUsernameForUser } = require("../../service/auth.service");
const { hashingPassword } = require("../../utils/validation");
const sequelize = require("../../model/connection");
const { DataTypes } = require("sequelize");
const sendEmailService = require("../../utils/email");
const instituteTeachers = require("../../models/institute_teachers")(
  sequelize,
  DataTypes
);
const jwt = require("jsonwebtoken");
const users = require("../../models/users")(sequelize, DataTypes);

//post departments
const createDepartment = async (req, res) => {
  const { name, id, role } = req.body;

  // Check if the user has the role of "institute"
  if (role !== "institute") {
    return res.status(403).json({
      message:
        'Only users with the role of "institute" can post a new department',
    });
  }

  if (!name || !id) {
    return res.status(400).send("Missing required fields");
  }

  const departmentData = {
    name: name,
    institute_id: id,
  };
  try {
    // Check if the department already exists
    const existQuery =
      "SELECT * FROM institute_departments WHERE institute_id = ? AND name = ?";
    const [existingDepartments] = await mysqlcon
      .promise()
      .query(existQuery, [id, name]);

    if (existingDepartments.length > 0) {
      return res.status(400).send("This Department already exists");
    }

    // Insert department into 'institute_departments' table
    const query = "INSERT INTO institute_departments SET ?";
    await mysqlcon.promise().query(query, departmentData);

    res.status(200).send("Department created successfully");
  } catch (err) {
    console.error("Error inserting department:", err);
    res.status(500).send("Internal server error");
  }
};

const getDepartments = async (req, res) => {
  const { id } = req.params;
  try {
    const query = "SELECT * FROM institute_departments WHERE institute_id = ?";

    mysqlcon.query(query, [id], (err, rows, fields) => {
      if (err) {
        console.error("Error getting departments:", err.message);
        res.status(500).json({ error: "An error occurred while fetching departments" });
      } else {
        res.json({ data: rows, count: rows.length });
      }
    });
  } catch (err) {
    console.error("Error getting departments:", err.message);
    res.status(500).json({ error: "An error occurred while fetching departments" });
  }
};

//create teachers
const createTeacher = async (req, res) => {
  const { name, designation, specialization, email, phone, department_id } =
    req.body.teacher;
  const user_id = req.body.id;

  if (
    !name ||
    !designation ||
    !specialization ||
    !email ||
    !phone ||
    !department_id ||
    !user_id
  ) {
    return res.status(400).send("Missing required fields");
  }
  // Check if the teacher already exists based on email and phone number
  const existTeachersemail = "SELECT * FROM institute_teachers WHERE email = ?";
  const [existingTeachers] = await mysqlcon
    .promise()
    .query(existTeachersemail, [email]);
  if (existingTeachers.length > 0) {
    return res
      .status(400)
      .send("Already in this Teacher have email already exists");
  }
  // Check if the teacher already exists based on phone number
  const existTeachersphone = "SELECT * FROM institute_teachers WHERE phone = ?";
  const [existingphone] = await mysqlcon
    .promise()
    .query(existTeachersphone, [phone]);
  if (existingphone.length > 0) {
    return res
      .status(400)
      .send("Already in this Teacher have phone number already exists");
  }
  // Check if the teacher designation field HOD already exists
  if (designation === "Head-Of-Department") {
    const existQueryHod =
      "SELECT * FROM institute_teachers WHERE designation = 'Head-Of-Department' AND department_id = ?";
    const [existHod] = await mysqlcon
      .promise()
      .query(existQueryHod, [department_id]);

    if (existHod.length > 0) {
      return res.status(400).send("Your department already has an HOD");
    }
  }
  try {
    const existteacherUsersQuery = "SELECT * FROM users WHERE email = ?";
    const [existTeacherUsers] = await mysqlcon
      .promise()
      .query(existteacherUsersQuery, [email]);
    if (existTeacherUsers.length > 0) {
      const token = jwt.sign(
        { email: existTeacherUsers[0].email },
        process.env.JWT_SECRET,
        {
          expiresIn: "5m",
        }
      );
      const sendUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/invitation/${token}?email=${encodeURIComponent(
        email
      )}&department_id=${department_id}`;
      const replacements = {
        name: `${
          existTeacherUsers[0]?.first_name + " " + existTeacherUsers[0]?.last_name
        }`,
        sendUrl: sendUrl,
      };

      const mailConfig = {
        email: email,
        subject: "Invitation to Join as a Teacher by Institute",
      };
      sendEmailService.sendTemplatedEmail(
        mailConfig,
        replacements,
        "SEND_TEACHER_INVITE"
      );
      const status = "pending";
      // Insert teacher into 'institute_teachers' table
      const insertQuery =
        "INSERT INTO institute_teachers(institute_id, department_id, name, specialization, email, phone,designation,status) VALUES(?,?,?,?,?,?,?,?)";
      const values = [
        user_id,
        department_id,
        name,
        specialization,
        email,
        phone,
        designation,
        status,
      ];
      await mysqlcon.promise().query(insertQuery, values);

      return res.status(201).json({
        existUser: true,
        message: "Invitation email sent to existing user",
      });
    } else {
      // Insert teacher into 'institute_teachers' table
      const insertQuery =
        "INSERT INTO institute_teachers(institute_id, department_id, name, specialization, email, phone,designation) VALUES(?,?,?,?,?,?,?)";
      const values = [
        user_id,
        department_id,
        name,
        specialization,
        email,
        phone,
        designation,
      ];
      await mysqlcon.promise().query(insertQuery, values);

      res.status(201).json({
        existUser: false,
        message: "Teacher created successfully",
      });
    }
  } catch (err) {
    console.error("Error inserting teacher:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
//get the teachers
const getTeachers = (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM institute_teachers where department_id = ?";
  mysqlcon.query(query, id, (err, data) => {
    if (err) {
      console.error("Error getting teachers:", err);
      return;
    }
    res.send(data);
  });
};
// Edit the department name
const Updatedepartments = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const query = "UPDATE institute_departments SET name = ? WHERE id = ?";
  mysqlcon.query(query, [name, id], (err, result) => {
    if (err) {
      console.error("Error updating department name:", err);
      res.status(500).send("Error updating department name");
      return;
    }
    res.status(200).send("Department name updated successfully");
  });
};
//delete the departments
const Deletedepartments = (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM institute_departments WHERE id = ?";
  mysqlcon.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).send("Error deleting department");
      return;
    }
    res.status(200).send("Department deleted successfully");
  });
};
//Edit the teachers
const Updateteacher = (req, res) => {
  const { id } = req.params;
  console.log(req.body);
  const { name, designation, specialization, email, phone } = req.body;
  const query =
    "UPDATE institute_teachers SET name = ?,designation =?,specialization =?,email =?,phone=? WHERE id =? ";
  mysqlcon.query(
    query,
    [name, designation, specialization, email, phone, id],
    (err, result) => {
      if (err) {
        res.status(500).send("Error updating teacher");
        return;
      }
      res.status(200).send("Teacher updated successfully");
    }
  );
};
//delete the teachers
const Deleteteacher = (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM institute_teachers WHERE id = ?";
  mysqlcon.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).send("Error deleting teacher");
      return;
    }
    res.status(200).send("Teacher deleted successfully");
  });
};
// Create Teacher Profile Endpoint
const createTeacherProfile = async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    // Validation
    if (!name || !email || !phone) {
      return res
        .status(400)
        .json({ message: "Name, email, and phone are required" });
    }
    // Generate username
    const username = await createUsernameForUser();

    // Hash password
    const password = await hashingPassword("eksathi123");

    // Extract first and last name
    const [firstName, lastName] = name.split(" ");

    // Create display name
    const displayName = email.slice(0, email.indexOf("@"));

    // Create user profile
    await users.create({
      username,
      email,
      password,
      role: "teacher",
      display_name: displayName,
      first_name: firstName,
      last_name: lastName,
      phone,
      status: "active",
    });

    // Check if the teacher exists in the institute_teachers table
    const [rows] = await mysqlcon
      .promise()
      .query("SELECT * FROM institute_teachers WHERE email = ?", [email]);
    if (rows.length > 0) {
      // Update status in institute_teachers table
      const updateQuery =
        "UPDATE institute_teachers SET status = ? WHERE email = ?";
      const values = ["active", email];
      await mysqlcon.promise().query(updateQuery, values);
    }
    res.status(201).json({ message: "Teacher profile created successfully" });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ message: "Failed to create profile" });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  createTeacher,
  getTeachers,
  Updatedepartments,
  Deletedepartments,
  Updateteacher,
  Deleteteacher,
  createTeacherProfile,
};
