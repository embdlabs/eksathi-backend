const { parse } = require("dotenv");
const { mysqlcon } = require("../../model/db");
const { default: axios } = require("axios");
const { DataTypes } = require('sequelize');
const  sequelize =require('../../model/connection')
const Teachers = require("../../models/teachers")(sequelize);
const Users = require("../../models/users")(sequelize);
const { Op } = require("sequelize");

// const validateUser = (req, res, next) => {
//   if (!req.body.username || !req.body.email) {
//     return res.status(400).json({
//       status: "fail",
//       message: "not a valid user",
//     });
//   }
//   next();
// }

// Fetch users with pagination and search
// const getUsers = (req, res) => {
//   try {
//     const { page, rowsPerPage, searchTerm } = req.query;
//     const offset = parseInt(page - 1) * parseInt(rowsPerPage);
//     const searchCondition = searchTerm
//       ? `WHERE first_name LIKE '%${searchTerm}%' OR last_name LIKE '%${searchTerm}%'`
//       : "";

//     const fetchUsersQuery = `
//       SELECT avatar_url, username, first_name, last_name, role, email, phone, bio, status, createdAt 
//       FROM users 
//       ${searchCondition}
//       LIMIT ? OFFSET ?`;

//     const countUsersQuery = `
//       SELECT COUNT(*) AS userCount 
//       FROM users 
//       ${searchCondition}`;

//     mysqlcon.query(
//       fetchUsersQuery,
//       [parseInt(rowsPerPage), offset],
//       (err, userResult) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({ message: "Internal Server Error" });
//         }

//         mysqlcon.query(countUsersQuery, (err, countResult) => {
//           if (err) {
//             console.error(err);
//             return res.status(500).json({ message: "Internal Server Error" });
//           }

//           const userCount = countResult[0].userCount;
//           return res.status(200).json({
//             message: "Users found",
//             users: userResult,
//             userCount,
//           });
//         });
//       }
//     );
//   } catch (error) {
//     console.error(error);
//     return res.status(409).json({ message: "Something went wrong" });
//   }
// };


const getUsers = async (req, res) => {
    mysqlcon.query(`SELECT 
      u.id, 
      u.username,
      u.display_name,
      CONCAT(u.first_name, " ", u.last_name) AS full_name, 
      u.first_name,
      u.middle_name,
      u.last_name,
      u.email, 
      u.phone, 
      u.role,
      u.is_online,
      u.status,
      u.bio,
      u.avatar_url,
      u.createdAt,
      u.updatedAt,
      u.show_contact_details,
      u.subject,
      u.teaching_method,
      u.qualification,
      u.experience,
      u.rating,
      u.login_count,
      u.is_verified,
      up.dob,
      up.location,
      up.skills,
      up.education
      FROM 
        users u
      LEFT JOIN 
        user_profiles up ON u.id = up.user_id
      ORDER BY u.id DESC`, (error, results, fields) => {
      if (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
      } else {
        console.log('Users fetched:', results.length);
        res.json(results);
      }
    });
};

  const getFilteredUsers = (req, res) => {
    const { searchTerm, roleFilters } = req.body;
  
    let query = `
      SELECT 
        u.id, re
        CONCAT(up.first_name, " ", up.last_name) AS display_name, 
        u.email, 
        u.phone, 
        u.role,
        u.is_online,
        u.status,
        up.dob,
        up.location,
        up.skills,
        up.education
      FROM 
        users u
      LEFT JOIN 
        user_profiles up ON u.id = up.user_id
      WHERE 
        1=1 
    `;
  
    // Build role filter query
    if (roleFilters.student || roleFilters.teacher || roleFilters.professional) {
      const roleConditions = [];
      if (roleFilters.student) roleConditions.push("u.role = 'student'");
      if (roleFilters.teacher) roleConditions.push("u.role = 'teacher'");
      if (roleFilters.professional) roleConditions.push("u.role = 'professional'");
  
      query += ` AND (${roleConditions.join(' OR ')})`;
    }
  
    // Add search term filter
    if (searchTerm) {
      query += ` AND (up.first_name LIKE ? OR up.last_name LIKE ?)`;
    }
  
    // Add order by clause for consistency
    query += ` ORDER BY u.id`;
  
    const queryParams = [];
    if (searchTerm) {
      const searchTermLike = `%${searchTerm.toLowerCase()}%`;
      queryParams.push(searchTermLike, searchTermLike);
    }
  
    mysqlcon.query(query, queryParams, (error, results) => {
      if (error) {
        console.error('Error fetching filtered users:', error);
        res.status(500).send('Internal Server Error');
      } else {
        res.json(results);
      }
    });
  };
  

const latestusers = (req, res) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  try {
    mysqlcon.query(
      "SELECT first_name, last_name, phone, email, avatar_url, bio, status, createdAt, role FROM users WHERE createdAt >= ?",
      [oneWeekAgo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        return res.status(200).json({
          message: "Latest User found",
          result,
        });
      }
    );
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const createUser = (req, res) => {
  const { username, avatar_url, email, role } = req.body;

  if (!username || !avatar_url || !email || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const newUser = {
    username,
    avatar_url,
    email,
    role,
  };
  const query = `INSERT INTO users SET ?`;

  mysqlcon.query(query, newUser, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    return res
      .status(201)
      .json({ message: "User created successfully", user_id: result.insertId });
  });
};



const updateUser = async (req, res) => {
  const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      role,
      dob,
      location,
      skills,
      education,
      display_name
    } = req.body;
    const updateUserQuery = `
      UPDATE users 
      SET 
       first_name = ?, 
        last_name = ?, 
        display_name = ?, 
        email = ?, 
        phone = ?, 
        role = ? 
      WHERE id = ?;
    `;
  
    const updateUserProfileQuery = `
      UPDATE user_profiles 
      SET 
        first_name = ?, 
        last_name = ?, 
        dob = ?, 
        location = ?, 
        skills = ?, 
        education = ? 
      WHERE user_id = ?;
    `;
  
    mysqlcon.query(updateUserQuery, [first_name, last_name,display_name,email, phone, role, id], (error, userResult) => {
      if (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
      } else {
        mysqlcon.query(updateUserProfileQuery, [first_name, last_name, dob, location, skills, education, id], (error, profileResult) => {
          if (error) {
            console.error('Error updating user profile:', error);
            res.status(500).send('Internal Server Error');
          } else {
            res.send('User updated successfully');
          }
        });
      }
    });
  };
  

const deleteUser = (req, res) => {
  const userId = req.params.id;

  mysqlcon.query('DELETE FROM user_profiles WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error deleting user_profiles:', error);
      return res.status(500).send('Internal Server Error');
    }

    mysqlcon.query('DELETE FROM award WHERE user_id = ?', [userId], (error, results) => {
      if (error) {
        console.error('Error deleting awards:', error);
        return res.status(500).send('Internal Server Error');
      }

      mysqlcon.query('DELETE FROM research WHERE user_id = ?', [userId], (error, results) => {
        if (error) {
          console.error('Error deleting research:', error);
          return res.status(500).send('Internal Server Error');
        }

        mysqlcon.query('DELETE FROM skills WHERE user_id = ?', [userId], (error, results) => {
          if (error) {
            console.error('Error deleting skills:', error);
            return res.status(500).send('Internal Server Error');
          }

          mysqlcon.query('DELETE FROM certifications WHERE user_id = ?', [userId], (error, results) => {
            if (error) {
              console.error('Error deleting certificates:', error);
              return res.status(500).send('Internal Server Error');
            }

            mysqlcon.query('DELETE FROM institute_contacts WHERE user_id = ?', [userId], (error, results) => {
              if (error) {
                console.error('Error deleting institute_contacts:', error);
                return res.status(500).send('Internal Server Error');
              }

            mysqlcon.query('DELETE FROM users WHERE id = ?', [userId], (error, results) => {
              if (error) {
                console.error('Error deleting users:', error);
                return res.status(500).send('Internal Server Error');
              }

              res.status(200).send(`User with ID ${userId} deleted successfully`);
            });
            });
          });
        });
      });
    });
  });
};


// const dailyactivity = (req, res) => {
//   try {
//     const { startDate, endDate } = req.query; // Changed from req.params to req.query
//     console.log("testing data is ", req.query);
    
//     // Validate date format (YYYY-MM-DD)
//     const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
//     let queryStartDate, queryEndDate;
//     const now = new Date();
    
//     // Case 1: Both startDate and endDate provided
//     if (startDate && endDate && dateRegex.test(startDate) && dateRegex.test(endDate)) {
//       queryStartDate = `${startDate} 00:00:00`;
//       queryEndDate = `${endDate} 23:59:59`;
//     } 
//     // Case 2: Only startDate provided - show one week from startDate
//     else if (startDate && dateRegex.test(startDate) && !endDate) {
//       const start = new Date(startDate);
//       const end = new Date(start);
//       end.setDate(end.getDate() + 7); // Add 7 days
      
//       queryStartDate = `${startDate} 00:00:00`;
//       queryEndDate = end.toISOString().slice(0, 10) + ' 23:59:59';
//     } 
//     // Case 3: Only endDate provided - show from today/now to endDate
//     else if (endDate && dateRegex.test(endDate) && !startDate) {
//       queryStartDate = now.toISOString().slice(0, 19).replace('T', ' ');
//       queryEndDate = `${endDate} 23:59:59`;
//     } 
//     // Case 4: No dates provided - default to last 24 hours
//     else {
//       const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
//       queryStartDate = yesterday.toISOString().slice(0, 19).replace('T', ' ');
//       queryEndDate = now.toISOString().slice(0, 19).replace('T', ' ');
//     }
    
//     console.log("Query Start Date:", queryStartDate);
//     console.log("Query End Date:", queryEndDate);
    
//     // Query to get user statistics based on date range
//     const query = `
//       SELECT 
//         COUNT(*) as totalJoined,
//         SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
//         SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as teachers,
//         SUM(CASE WHEN role = 'professional' THEN 1 ELSE 0 END) as professionals,
//         SUM(CASE WHEN role = 'institute' THEN 1 ELSE 0 END) as institutes
//       FROM users
//       WHERE createdAt >= ? AND createdAt <= ?
//     `;
    
//     mysqlcon.query(query, [queryStartDate, queryEndDate], (err, results) => {
//       if (err) {
//         console.error('Database error:', err);
//         return res.status(500).json({
//           success: false,
//           message: 'Error fetching daily activity',
//           error: err.message
//         });
//       }
      
//       // Format the response
//       const activity = results[0] || {};
      
//       const response = {
//         success: true,
//         message: 'User Activity Report',
//         data: {
//           "User Joined Today": activity.totalJoined || 0,
//           "Students": activity.students || 0,
//           "Teachers": activity.teachers || 0,
//           "Professionals": activity.professionals || 0,
//           "Institutes": activity.institutes || 0,
//           "Period": {
//             "From": queryStartDate,
//             "To": queryEndDate
//           },
//           "Generated At": new Date().toISOString()
//         }
//       };
      
//       return res.status(200).json(response);
//     });
    
//   } catch (error) {
//     console.error('Server error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };



// const dailyactivity = (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     console.log("testing data is ", req.query);
    
//     // Validate date format (YYYY-MM-DD)
//     const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
//     let queryStartDate, queryEndDate;
//     const now = new Date();
    
//     // Case 1: Both startDate and endDate provided
//     if (startDate && endDate && dateRegex.test(startDate) && dateRegex.test(endDate)) {
//       // Ensure startDate is before endDate - swap if needed
//       if (new Date(startDate) > new Date(endDate)) {
//         queryStartDate = `${endDate} 00:00:00`;
//         queryEndDate = `${startDate} 23:59:59`;
//       } else {
//         queryStartDate = `${startDate} 00:00:00`;
//         queryEndDate = `${endDate} 23:59:59`;
//       }
//     } 
//     // Case 2: Only startDate provided - show one week from startDate
//     else if (startDate && dateRegex.test(startDate) && !endDate) {
//       const start = new Date(startDate);
//       const end = new Date(start);
//       end.setDate(end.getDate() + 7);
      
//       queryStartDate = `${startDate} 00:00:00`;
//       queryEndDate = end.toISOString().slice(0, 10) + ' 23:59:59';
//     } 
//     // Case 3: Only endDate provided - show from today to endDate
//     else if (endDate && dateRegex.test(endDate) && !startDate) {
//       queryStartDate = now.toISOString().slice(0, 19).replace('T', ' ');
//       queryEndDate = `${endDate} 23:59:59`;
//     } 
//     // Case 4: No dates provided - default to last 24 hours
//     else {
//       const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
//       queryStartDate = yesterday.toISOString().slice(0, 19).replace('T', ' ');
//       queryEndDate = now.toISOString().slice(0, 19).replace('T', ' ');
//     }
    
//     console.log("Query Start Date:", queryStartDate);
//     console.log("Query End Date:", queryEndDate);
    
//     // Combined query to get all statistics
//     const query = `
//       SELECT 
//         COUNT(DISTINCT u.id) as totalUsers,
//         SUM(CASE WHEN u.role = 'student' THEN 1 ELSE 0 END) as students,
//         SUM(CASE WHEN u.role = 'teacher' THEN 1 ELSE 0 END) as teachers,
//         SUM(CASE WHEN u.role = 'professional' THEN 1 ELSE 0 END) as professionals,
//         SUM(CASE WHEN u.role = 'institute' THEN 1 ELSE 0 END) as institutes,
//         (SELECT COUNT(*) FROM comments WHERE createdAt >= ? AND createdAt <= ?) as totalComments,
//         (SELECT COUNT(*) FROM answers WHERE createdAt >= ? AND createdAt <= ?) as totalAnswers,
//         (SELECT COUNT(*) FROM questions WHERE createdAt >= ? AND createdAt <= ?) as totalQuestions,
//         (SELECT COUNT(*) FROM events WHERE createdAt >= ? AND createdAt <= ?) as totalEvents
//       FROM users u
//       WHERE u.createdAt >= ? AND u.createdAt <= ?
//     `;
    
//     // Parameters for all the date ranges
//     const params = [
//       queryStartDate, queryEndDate,  // comments
//       queryStartDate, queryEndDate,  // answers
//       queryStartDate, queryEndDate,  // questions
//       queryStartDate, queryEndDate,  // events
//       queryStartDate, queryEndDate   // users
//     ];
    
//     mysqlcon.query(query, params, (err, results) => {
//       if (err) {
//         console.error('Database error:', err);
//         return res.status(500).json({
//           success: false,
//           message: 'Error fetching daily activity',
//           error: err.message
//         });
//       }
      
//       // Format the response
//       const activity = results[0] || {};
      
//       const response = {
//         success: true,
//         message: 'Activity Report',
//         data: {
//           "User Joined Today": activity.totalUsers || 0,
//           "Students": String(activity.students || 0),
//           "Teachers": String(activity.teachers || 0),
//           "Professionals": String(activity.professionals || 0),
//           "Institutes": String(activity.institutes || 0),
//           "Comments": String(activity.totalComments || 0),
//           "Answers": String(activity.totalAnswers || 0),
//           "Questions": String(activity.totalQuestions || 0),
//           "Events": String(activity.totalEvents || 0),
//           "Period": {
//             "From": queryStartDate,
//             "To": queryEndDate
//           },
//           "Generated At": new Date().toISOString()
//         }
//       };
      
//       return res.status(200).json(response);
//     });
    
//   } catch (error) {
//     console.error('Server error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };

const dailyactivity = (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log("Filter params:", req.query);
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    let queryStartDate, queryEndDate;
    const now = new Date();
    
    // Case 1: Both startDate and endDate provided
    if (startDate && endDate && dateRegex.test(startDate) && dateRegex.test(endDate)) {
      // Ensure startDate is before endDate - swap if needed
      if (new Date(startDate) > new Date(endDate)) {
        queryStartDate = `${endDate} 00:00:00`;
        queryEndDate = `${startDate} 23:59:59`;
      } else {
        queryStartDate = `${startDate} 00:00:00`;
        queryEndDate = `${endDate} 23:59:59`;
      }
    } 
    // Case 2: Only startDate provided - show one week from startDate
    else if (startDate && dateRegex.test(startDate) && !endDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      
      queryStartDate = `${startDate} 00:00:00`;
      queryEndDate = end.toISOString().slice(0, 10) + ' 23:59:59';
    } 
    // Case 3: Only endDate provided - show from today to endDate
    else if (endDate && dateRegex.test(endDate) && !startDate) {
      queryStartDate = now.toISOString().slice(0, 19).replace('T', ' ');
      queryEndDate = `${endDate} 23:59:59`;
    } 
    // Case 4: No dates provided - default to last 24 hours
    else {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      queryStartDate = yesterday.toISOString().slice(0, 19).replace('T', ' ');
      queryEndDate = now.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    console.log("Query Start Date:", queryStartDate);
    console.log("Query End Date:", queryEndDate);
    
    // Single optimized query that filters all tables by the date range
    const query = `
      SELECT 
        (SELECT COUNT(DISTINCT id) FROM users WHERE createdAt >= ? AND createdAt <= ?) as totalUsers,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND createdAt >= ? AND createdAt <= ?) as students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND createdAt >= ? AND createdAt <= ?) as teachers,
        (SELECT COUNT(*) FROM users WHERE role = 'professional' AND createdAt >= ? AND createdAt <= ?) as professionals,
        (SELECT COUNT(*) FROM users WHERE role = 'institute' AND createdAt >= ? AND createdAt <= ?) as institutes,
        (SELECT COUNT(*) FROM comments WHERE createdAt >= ? AND createdAt <= ?) as totalComments,
        (SELECT COUNT(*) FROM answers WHERE createdAt >= ? AND createdAt <= ?) as totalAnswers,
        (SELECT COUNT(*) FROM questions WHERE createdAt >= ? AND createdAt <= ?) as totalQuestions,
        (SELECT COUNT(*) FROM events WHERE createdAt >= ? AND createdAt <= ?) as totalEvents,
        (SELECT COUNT(*) FROM job_applications WHERE createdAt >= ? AND createdAt <= ? AND is_applied = 1) as totalJobs
    `;
    
    // Parameters for all queries (each date range appears twice for the subqueries)
    const params = [
      queryStartDate, queryEndDate,  // totalUsers
      queryStartDate, queryEndDate,  // students
      queryStartDate, queryEndDate,  // teachers
      queryStartDate, queryEndDate,  // professionals
      queryStartDate, queryEndDate,  // institutes
      queryStartDate, queryEndDate,  // totalComments
      queryStartDate, queryEndDate,  // totalAnswers
      queryStartDate, queryEndDate,  // totalQuestions
      queryStartDate, queryEndDate ,  // totalEvents
      queryStartDate, queryEndDate   // totalJobs
    ];
    
    mysqlcon.query(query, params, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching daily activity',
          error: err.message
        });
      }
      
      // Format the response
      const activity = results[0] || {};
      
      const response = {
        success: true,
        message: 'Activity Report',
        data: {
          "User Joined Today": activity.totalUsers,
          "Students": activity.students,
          "Teachers": activity.teachers,
          "Professionals": activity.professionals,
          "Institutes": activity.institutes,
          "Comments": activity.totalComments,
          "Answers": activity.totalAnswers,
          "Questions": activity.totalQuestions,
          "Events": activity.totalEvents,
          "TotalJobs": activity.totalJobs,
          "Period": {
            "From": queryStartDate,
            "To": queryEndDate
          },
          "Generated At": new Date().toISOString()
        }
      };
      
      return res.status(200).json(response);
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


const getAllLocation = (req,res)=>{
  try {
    const  query = 'SELECT * FROM locations'
    mysqlcon.query(query,(error,result)=>{
     if (error) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching daily activity',
          error: err.message
        });
      }
       return res.status(200).json({
      success: true,
      message: 'Fetching the all location data',
      data:result
    });

    })
  } catch (error) {
     return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}






const getAllSubjectAndClass = async (req, res) => {
  try {
    // Query to get all unique subjects
    const subjectQuery = `
      SELECT DISTINCT subjects.subject
      FROM subjects s
      CROSS JOIN JSON_TABLE(
        s.subject_name,
        '$[*]' COLUMNS (
          subject VARCHAR(100) PATH '$'
        )
      ) AS subjects
      WHERE subjects.subject IS NOT NULL 
        AND subjects.subject != ''
      ORDER BY subjects.subject;
    `;

    // Query to get all unique classes
    const classQuery = `
      SELECT DISTINCT class_name
      FROM subjects
      WHERE class_name IS NOT NULL 
        AND class_name != ''
      ORDER BY class_name;
    `;

    // Execute both queries
    const [subjectResult, classResult] = await Promise.all([
      mysqlcon.promise().query(subjectQuery),
      mysqlcon.promise().query(classQuery)
    ]);

    // Extract just the values into arrays
    const allSubject = subjectResult[0].map(row => row.subject);
    const allClass = classResult[0].map(row => row.class_name);

    // Return in the exact format you requested
    return res.status(200).json({
      allSubject: allSubject,
      allClass: allClass
    });

  } catch (error) {
    console.error('Error in getAllSubjectAndClass:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};


module.exports = {
  // validateUser,
  getAllSubjectAndClass,
  getAllLocation,

  getUsers,
  latestusers,
  createUser,
  updateUser,
  deleteUser,
  getFilteredUsers,
  dailyactivity
};
