const { mysqlcon } = require("../model/db");
const {DBMODELS} = require("../models/init-models")

const createSubject = (req, res) => {
  const { category, subject_name, class_name } = req.body;

  const sql = `INSERT INTO subjects (category, subject_name, class_name) VALUES (?, ?, ?)`;
  mysqlcon.query(sql, [category, subject_name, class_name], (err, result) => {
    if (err) {
      console.error(" Error creating subject:", err);
      return res.status(500).json({ error: "Error creating subject" });
    }
    res
      .status(201)
      .json({ id: result.insertId, category, subject_name, class_name });
  });
};

const getAllSubjects = (req, res) => {
  const sql = `SELECT * FROM subjects ORDER BY id ASC`;
  mysqlcon.query(sql, (err, result) => {
    if (err) {
      console.error(" Error fetching subjects:", err);
      return res.status(500).json({ error: "Error fetching subjects" });
    }
    res.json(result);
  });
};

const getSubjectById = (req, res) => {
  const { id } = req.params;

  const sql = `SELECT * FROM subjects WHERE id = ?`;
  mysqlcon.query(sql, [id], (err, result) => {
    if (err) {
      console.error(" Error fetching subject:", err);
      return res.status(500).json({ error: "Error fetching subject" });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json(result[0]);
  });
};

// ✅ Update subject
const updateSubject = (req, res) => {
  const { id } = req.params;
  const { category, subject_name, class_name } = req.body;

  const sql = `UPDATE subjects SET category = ?, subject_name = ?, class_name = ? WHERE id = ?`;
  mysqlcon.query(
    sql,
    [category, subject_name, class_name, id],
    (err, result) => {
      if (err) {
        console.error(" Error updating subject:", err);
        return res.status(500).json({ error: "Error updating subject" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Subject not found" });
      }
      res.json({ id, category, subject_name, class_name });
    }
  );
};

// ✅ Delete subject
const deleteSubject = (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM subjects WHERE id = ?`;
  mysqlcon.query(sql, [id], (err, result) => {
    if (err) {
      console.error(" Error deleting subject:", err);
      return res.status(500).json({ error: "Error deleting subject" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json({ message: "✅ Subject deleted successfully" });
  });
};

const filterSubjects = (req, res) => {
  const { class_name, category, course_name } = req.query;

  let query = `
    SELECT 
      id,
      class_name, 
      course_name, 
      category, 
      subject_name 
    FROM subjects 
    WHERE 1=1
  `;
  const values = [];

  if (class_name) {
    query += " AND class_name = ?";
    values.push(class_name);
  }

  if (category) {
    query += " AND category = ?";
    values.push(category);
  }

  if (course_name) {
    query += " AND course_name = ?";
    values.push(course_name);
  }

  mysqlcon.query(query, values, (err, result) => {
    if (err) {
      console.error("❌ Error filtering data:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for given filters" });
    }

    res.status(200).json(result);
  });
};


const getOnlyCourse = async (req, res) => {
  console.log("📢 Inside getOnlyCourse API");  // <--- add this
  const sql = `SELECT DISTINCT course_name FROM subjects ORDER BY course_name ASC`;

  mysqlcon.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error fetching courses:", err);
      return res.status(500).json({ error: "Error fetching courses" });
    }

    console.log("✅ SQL Result:", result); // log raw result

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No courses found" });
    }

    res.json({
      success: true,
      courses: result.map(r => r.course_name)
    });
  });
};


const getOnlyClassName = async (req, res) => {
  const sql = `SELECT DISTINCT class_name FROM subjects ORDER BY class_name ASC`;

  mysqlcon.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error fetching courses:", err);
      return res.status(500).json({ error: "Error fetching courses" });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No class found" });
    }

    res.json({
      success: true,
      class: result.map(r => r.class_name)
    });
  });
};

const filterbyclassName = async (req, res) => {
  const { className } = req.params;
  const sql = `SELECT * FROM subjects WHERE class_name = ?`;

  mysqlcon.query(sql, [className], (err, result) => {
    if (err) {
      console.error("❌ Error fetching subjects:", err);
      return res.status(500).json({ error: "Error fetching subjects" });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No class found" });
    }

    res.json({
      success: true,
      category: result.map(r => r.category)
    });
  });
};



module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  filterSubjects,
  getOnlyCourse,
  getOnlyClassName,
  filterbyclassName

};
