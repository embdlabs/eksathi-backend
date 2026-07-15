const { default: axios } = require("axios");
const { DataTypes } = require('sequelize');
const { mysqlcon } = require("../../model/db");
const  sequelize =require('../../model/connection')
const Teachers = require("../../models/teachers")(sequelize);
const { Op } = require("sequelize");

const getAllTeachers = async (req, res) => {
    try {
      const teachers = await Teachers.findAll();
      res.json(teachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      res.status(500).send('Internal Server Error hai');
    }
  };

  const postAllTeachers = async (req, res) => {
  try {
    const teachers = req.body; // expecting an array of teacher objects

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ error: "Please provide an array of teachers" });
    }

    // Check for duplicate emails in DB
    const existingTeachers = await Teachers.findAll({
      where: {
        contact_info: {
          [Op.in]: teachers.map((teacher) => teacher.contact_info),
        },
      },
    });

    if (existingTeachers.length > 0) {
      const duplicateEmails = existingTeachers.map((t) => t.contact_info);
      return res.status(400).json({
        error: `Duplicate emails found: ${duplicateEmails.join(", ")}`,
      });
    }

    // Insert teachers using Sequelize
    const newTeachers = await Teachers.bulkCreate(teachers);

    res.status(201).json({
      message: `Created ${newTeachers.length} new teachers`,
      data: newTeachers,
    });
  } catch (error) {
    console.error("❌ Error creating teachers:", error);
    res.status(500).json({ error: "Error creating teachers" });
  }
};
  
  const UpdateTeacher = async (req,res) => {
    const id = req.params.id;
    const update = req.body;
    // console.log("Ye Id : ",id)
    mysqlcon.query(`UPDATE Teachers SET ? WHERE id = ?`,[update , id], (err,results) => {
      if(err){
        console.log(" UpdateTeacher Error :",err)
        res.status(500).json({message : 'Error Updating Teacher'});
      }
      else{
        console.log("Ho gaye Update ")
        res.json({message : 'Teacher Updated SuccessFully'});
      }
    })
  }

  const DeleteTeacher = async (req,res) => {
      const id = req.params.id;
    
      mysqlcon.query(`DELETE FROM Teachers WHERE id = ?`, [id], (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).json({ message: 'Error deleting teacher' });
        } else {
          res.json({ message: 'Teacher deleted successfully' });
        }
      });
    }

    const UpdateExcelTeacher = () => {
      console.log("Update tak pahunch gaye")
      const { buffer, updatedData } = req.body;

  if (!buffer || !updatedData) {
    return res.status(400).send('Invalid data');
  }
    }
  
    const DeleteExcelTeacher = () =>{
      console.log("Delete tak pahunch gaye")

    }

const getFilterCityStateTeacher = (req, res) => {
  try {
    const { city, state } = req.query || req.params; // use query params ?city=xx&state=yy

    if (!city && !state) {
      return res.status(400).json({ message: "Please provide city or state" });
    }

    let sql = "SELECT * FROM Teachers WHERE 1=1";
    let values = [];

    if (city) {
      sql += " AND city = ?";
      values.push(city);
    }

    if (state) {
      sql += " OR state = ?";
      values.push(state);
    }

    mysqlcon.query(sql, values, (err, teachers) => {
      if (err) {
        console.error("Error fetching teachers:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (!teachers.length) {
        return res.json([]);
      }

      // Collect all contacts
      const contacts = teachers.map(t => t.contact_info);
       
      // Find matching users by contact
      const userSql = "SELECT * FROM users WHERE email IN (?)";
      mysqlcon.query(userSql, [contacts], (err, users) => {
        if (err) {
          console.error("Error fetching users:", err);
          return res.status(500).json({ message: "Database error", error: err });
        }

        // Merge teachers + users
        const mergedData = teachers.map(teacher => {
          const user = users.find(u => u.contact === teacher.contact);
          return {
            ...teacher,
            user: user || null, // attach matching user
          };
        });

        return res.json(mergedData);
      });
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};




  module.exports = {
    getAllTeachers,
    postAllTeachers,
    UpdateTeacher,
    DeleteTeacher,
    UpdateExcelTeacher,
    DeleteExcelTeacher,
    getFilterCityStateTeacher
  };
  