const { DataTypes, where } = require("sequelize");
const { mysqlcon } = require("../../model/db");
const sequelize = require("../../model/connection");
const crypto = require('crypto');
const admissions = require("../../models/admissions")(sequelize, DataTypes);
const users = require("../../models/users")(sequelize, DataTypes);

const createAdmissions = async (req, res) => {
  const {
    id,
    course,
    duration,
    startfrom,
    courseDuration,
    seats,
    fees,
    lastDate,
    courseMode,
    courseType,
    role,
  } = req.body;
  
  if (role !== "institute") {
    return res
      .status(403)
      .json({ error: "Only users with the role of institute can post a new admissions" });
  }

  try {
    // Generate a random 8-digit number for admission_id
    const admission_id = Math.floor(10000000 + Math.random() * 90000000);
    
    console.log("Generated admission_id:", admission_id);
    
    const newAdmission = await admissions.create({
      institute_id: id,
      course_name: course,
      duration: duration,
      batch_start: startfrom,
      course_duration: courseDuration,
      seats: seats,
      fees: fees,
      last_date: lastDate,
      course_mode: courseMode,
      course_type: courseType,
      admission_id: admission_id, // Now it's a number
    });

    console.log("Created admission with ID:", newAdmission.admission_id);

    res.status(201).json({ 
      message: "Successfully created admission",
      admission_id: newAdmission.admission_id 
    });
  } catch (error) {
    console.error("Error creating admission:", error);
    res.status(400).json({ error: error.message });
  }
};

const updateAdmission = async (req, res) => {
  const { admissionId } = req.params;
  console.log("=== UPDATE ADMISSION DEBUG ===");
  console.log("admissionId from params:", admissionId);
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  const {
    id,
    course,
    course_name, // Added support for both naming conventions
    duration,
    startfrom,
    batch_start, // Added support for both naming conventions
    courseDuration,
    course_duration, // Added support for both naming conventions
    seats,
    fees,
    lastDate,
    last_date, // Added support for both naming conventions
    courseMode,
    course_mode, // Added support for both naming conventions
    courseType,
    course_type, // Added support for both naming conventions
    role,
    status
  } = req.body;

  // Validation
  if (!admissionId) {
    return res.status(400).json({ error: "Admission ID is required" });
  }

  if (role !== "institute") {
    return res.status(403).json({
      error: "Only users with the role of institute can update admissions",
    });
  }

  if (!id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Find the admission first
    const admission = await admissions.findByPk(admissionId);
    console.log("Found admission:", admission ? "Yes" : "No");

    if (!admission) {
      console.log("ERROR: Admission not found with ID:", admissionId);
      return res.status(404).json({ error: "Admission not found" });
    }

    console.log("Admission user_id:", admission.user_id);
    console.log("Request user id:", id);

    // Check if the institute owns this admission
    // Convert both to string for comparison
    // if (String(admission.user_id) !== String(id)) {
    //   console.log("ERROR: User not authorized to update this admission");
    //   return res.status(403).json({
    //     error: "You can only update your own admissions"
    //   });
    // }

    // Prepare update data - support both naming conventions
    const updateData = {
      course_name: course_name || course,
      batch_start: batch_start || startfrom,
      course_duration: course_duration || courseDuration,
      seats: seats,
      fees: fees,
      last_date: last_date || lastDate,
      course_mode: course_mode || courseMode,
      course_type: course_type || courseType,
      status:status
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log("Update data:", JSON.stringify(updateData, null, 2));

    // Update the admission
    await admission.update(updateData);

    console.log("SUCCESS: Admission updated successfully");

    res.status(200).json({
      message: "Successfully updated admission",
      data: admission,
    });
  } catch (error) {
    console.error("ERROR in updateAdmission:", error);
    res.status(500).json({
      error: error.message,
      details: "Internal server error while updating admission",
    });
  }
};

// Delete admission
const deleteAdmission = async (req, res) => {
  const { admissionId } = req.params; // Get admission ID from URL params
  const { id, role } = req.body; // Get institute ID and role from request body

  // if (role !== 'institute') {
  //   return res.status(403).send("Only users with the role of institute can delete admissions");
  // }

  try {
    // Find the admission first
    const admission = await admissions.findByPk(admissionId);

    if (!admission) {
      return res.status(404).send("Admission not found");
    }

    // Check if the institute owns this admission
    // if (admission.institute_id !== id) {
    //   return res.status(403).send("You can only delete your own admissions");
    // }

    // Delete the admission
    await admission.destroy();

    res.status(200).send("Successfully deleted admission");
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// const getAdmissions = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const data = await admissions.findAll({ where: { institute_id: id } });
    
    
//     // Extract all non-null enroll_user_id values
//     const enrolledUserIds = data
//       .filter(admission => {
//         const isEnrolled = admission.is_enrolled === true || admission.is_enrolled === 1;
//         const hasUserId = admission.enroll_user_id && 
//                          admission.enroll_user_id !== null && 
//                          admission.enroll_user_id !== '';
//         // console.log(`Filtering admission ${admission.id}: isEnrolled=${isEnrolled}, hasUserId=${hasUserId}`);
//         return isEnrolled && hasUserId;
//       })
//       .map(admission => admission.enroll_user_id);
    
//     // console.log("Enrolled user IDs: ", enrolledUserIds);
    
//     // Fetch all users at once
//     let usersData = [];
//     if (enrolledUserIds.length > 0) {
//       usersData = await users.findAll({
//         where: { 
//           id: enrolledUserIds 
//         },
//         attributes: ['id', 'first_name', 'last_name','username']
//       });
//     }
    
//     // console.log("Users data: ", usersData);
    
//     // Map users to admissions data
//     const admissionsWithUsers = data.map(admission => {
//       const admissionObj = admission.toJSON ? admission.toJSON() : admission;
      
//       if (admission.is_enrolled && admission.enroll_user_id) {
//         const user = usersData.find(u => u.id.toString() === admission.enroll_user_id.toString());
//         return {
//           ...admissionObj,
//           user: user || null
//         };
//       }
//       return admissionObj;
//     });
    
//     res.status(200).json(admissionsWithUsers);
//   } catch (error) {
//     console.error(error);
//     res.status(400).json({ error: error.message });
//   }
// };

const getAdmissions = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await admissions.findAll({ where: { institute_id: id } });
    
    // Extract and flatten all user IDs (handle both single values and arrays)
    const enrolledUserIds = [];
    
    data.forEach(admission => {
      if (admission.enroll_user_id) {
        // Check if enroll_user_id is an array
        if (Array.isArray(admission.enroll_user_id)) {
          enrolledUserIds.push(...admission.enroll_user_id.filter(id => id !== null && id !== ''));
        } else if (admission.enroll_user_id !== null && admission.enroll_user_id !== '') {
          enrolledUserIds.push(admission.enroll_user_id);
        }
      }
    });
    
    // Remove duplicates
    const uniqueUserIds = [...new Set(enrolledUserIds)];
    
    // Fetch all users at once
    let usersData = [];
    if (uniqueUserIds.length > 0) {
      usersData = await users.findAll({
        where: { 
          id: uniqueUserIds 
        },
        attributes: ['id', 'first_name', 'last_name', 'username']
      });
    }
    
    // Create a user lookup map for faster access
    const userMap = {};
    usersData.forEach(user => {
      const userObj = user.toJSON ? user.toJSON() : user;
      userMap[userObj.id] = userObj;
    });
    
    // Map users to admissions data
    const admissionsWithUsers = data.map(admission => {
      const admissionObj = admission.toJSON ? admission.toJSON() : admission;
      
      if (admission.enroll_user_id) {
        // Handle array of user IDs
        if (Array.isArray(admission.enroll_user_id)) {
          const enrolledUsers = admission.enroll_user_id
            .map(userId => userMap[userId])
            .filter(user => user !== undefined);
          
          return {
            ...admissionObj,
            users: enrolledUsers
          };
        } 
        // Handle single user ID
        else {
          const user = userMap[admission.enroll_user_id];
          return {
            ...admissionObj,
            user: user || null
          };
        }
      }
      
      // If no enroll_user_id, return admission as is (with all details)
      return admissionObj;
    });
    
    res.status(200).json(admissionsWithUsers);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const getAllAdmissions = async (req, res) => {
  try {
    const data = await admissions.findAll();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};



const getEnrollments = async (req, res) => {
  try {
    const { 
      user_id, 
      course_id, 
      enrollment_status, 
      payment_status,
      page = 1,
      limit = 10 
    } = req.query;

    // Build dynamic query
    let query = `
      SELECT 
        e.*,
        u.name as user_name,
        u.email as user_email,
        c.name as course_name,
        c.duration as course_duration
      FROM course_enrollments e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE 1=1
    `;
    
    const params = [];

    // Add filters if provided
    if (user_id) {
      query += ' AND e.user_id = ?';
      params.push(user_id);
    }

    if (course_id) {
      query += ' AND e.course_id = ?';
      params.push(course_id);
    }

    if (enrollment_status) {
      query += ' AND e.enrollment_status = ?';
      params.push(enrollment_status);
    }

    if (payment_status) {
      query += ' AND e.payment_status = ?';
      params.push(payment_status);
    }

    // Add sorting
    query += ' ORDER BY e.created_at DESC';

    // Add pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    // Execute query
    mysqlcon.query(query, params, (err, enrollments) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch enrollments",
          error: err.message
        });
      }

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM course_enrollments e 
        WHERE 1=1
      `;
      const countParams = [];

      if (user_id) {
        countQuery += ' AND e.user_id = ?';
        countParams.push(user_id);
      }

      if (course_id) {
        countQuery += ' AND e.course_id = ?';
        countParams.push(course_id);
      }

      if (enrollment_status) {
        countQuery += ' AND e.enrollment_status = ?';
        countParams.push(enrollment_status);
      }

      if (payment_status) {
        countQuery += ' AND e.payment_status = ?';
        countParams.push(payment_status);
      }

      mysqlcon.query(countQuery, countParams, (err, countResult) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch enrollments count",
            error: err.message
          });
        }

        const total = countResult[0].total;

        return res.status(200).json({
          success: true,
          message: "Enrollments fetched successfully",
          data: enrollments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            totalPages: Math.ceil(total / limit)
          }
        });
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments",
      error: error.message
    });
  }
};

const postEnrollment = async (req, res) => {
  const {
    fees,
    institute_id,
    course_id,
    course_name,
    batch_start,
    user_id,
    is_enrolled,
    admission_id
  } = req.body;

  console.log("REQUEST BODY:", req.body);

  try {
    // 1. Validate required fields
    if (!course_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Course ID and User ID are required"
      });
    }

    // 2. Prepare values
    const remarks = batch_start
      ? `Batch Start: ${batch_start}, Institute ID: ${institute_id}`
      : null;

    const amountPaid = typeof fees === "number" ? fees : 0.00;
    const isEnrolledValue = typeof is_enrolled !== "undefined" ? is_enrolled : 0;

    // 3. SQL Insert query for course_enrollments
    const enrollmentQuery = `
      INSERT INTO course_enrollments 
      (course_id, user_id, enrollment_status, payment_status, amount_paid, remarks, is_enrolled) 
      VALUES (?, ?, 'pending', 'pending', ?, ?, ?)
    `;

    mysqlcon.query(
      enrollmentQuery,
      [course_id, user_id, amountPaid, remarks, isEnrolledValue],
      (err, result) => {
        if (err) {
          console.error("Insert Error:", err);
          return res.status(400).json({
            success: false,
            message: "Failed to create enrollment",
            error: err.message
          });
        }

        const enrollmentId = result.insertId;

        // 4. Update admissions table - MySQL JSON approach
        if (institute_id && admission_id) {
          // First, fetch existing enroll_user_id
          const fetchQuery = `
            SELECT enroll_user_id 
            FROM admissions 
            WHERE institute_id = ? AND admission_id = ?
          `;

          mysqlcon.query(
            fetchQuery,
            [institute_id, admission_id],
            (err, admissionRows) => {
              if (err) {
                console.error("Fetch Admission Error:", err);
                return res.status(500).json({
                  success: false,
                  message: "Enrollment created, but failed to fetch admission record",
                  error: err.message
                });
              }

              // Parse existing enroll_user_id array
              let enrolledUsers = [];
              
              if (admissionRows.length > 0 && admissionRows[0].enroll_user_id) {
                const existingData = admissionRows[0].enroll_user_id;
                
                // Handle different data types
                if (typeof existingData === 'string') {
                  try {
                    enrolledUsers = JSON.parse(existingData);
                  } catch (parseError) {
                    // If parsing fails, treat as single value
                    enrolledUsers = [existingData];
                  }
                } else if (Array.isArray(existingData)) {
                  // Already an array (if using JSON column type)
                  enrolledUsers = existingData;
                } else {
                  // Single value
                  enrolledUsers = [existingData];
                }
              }

              // Ensure enrolledUsers is an array
              if (!Array.isArray(enrolledUsers)) {
                enrolledUsers = [];
              }

              // Add new user_id if not already present
              if (!enrolledUsers.includes(user_id)) {
                enrolledUsers.push(user_id);
              }

              // Convert array to JSON string for MySQL
              const updatedEnrollUsers = JSON.stringify(enrolledUsers);

              const updateAdmissionsQuery = `
                UPDATE admissions 
                SET is_enrolled = ?, 
                    enroll_user_id = ?
                WHERE institute_id = ?
                AND admission_id = ?
              `;

              mysqlcon.query(
                updateAdmissionsQuery,
                [isEnrolledValue, updatedEnrollUsers, institute_id, admission_id],
                (err, updateResult) => {
                  if (err) {
                    console.error("Admissions Update Error:", err);
                    return res.status(500).json({
                      success: false,
                      message: "Enrollment created, but failed to update admission record",
                      error: err.message
                    });
                  }

                  console.log("Admissions update result:", updateResult);

                  // 5. Fetch the newly inserted enrollment record
                  mysqlcon.query(
                    "SELECT * FROM course_enrollments WHERE id = ?",
                    [enrollmentId],
                    (err, enrollment) => {
                      if (err) {
                        console.error("Fetch Error:", err);
                        return res.status(500).json({
                          success: false,
                          message: "Enrollment created and admission updated, but failed to fetch enrollment",
                          error: err.message
                        });
                      }

                      return res.status(201).json({
                        success: true,
                        message: updateResult.affectedRows > 0 
                          ? "Enrollment created and admission updated successfully"
                          : "Enrollment created successfully (no matching admission found)",
                        data: enrollment[0],
                        admissionUpdated: updateResult.affectedRows > 0,
                        enrolledUsers: enrolledUsers
                      });
                    }
                  );
                }
              );
            }
          );
        } else {
          // If required fields for admission update are missing
          mysqlcon.query(
            "SELECT * FROM course_enrollments WHERE id = ?",
            [enrollmentId],
            (err, enrollment) => {
              if (err) {
                console.error("Fetch Error:", err);
                return res.status(500).json({
                  success: false,
                  message: "Enrollment created, but failed to fetch it",
                  error: err.message
                });
              }

              return res.status(201).json({
                success: true,
                message: "Enrollment created successfully (admission not updated - missing required fields)",
                data: enrollment[0],
                admissionUpdated: false
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create enrollment",
      error: error.message
    });
  }
};
// const postEnrollment = async (req, res) => {
//   const {
//     fees,
//     institute_id,
//     course_id,
//     course_name,
//     batch_start,
//     user_id,
//     is_enrolled,
//     admission_id
//   } = req.body;

//   console.log("REQUEST BODY:", req.body);

//   try {
//     // 1. Validate required fields
//     if (!course_id || !user_id) {
//       return res.status(400).json({
//         success: false,
//         message: "Course ID and User ID are required"
//       });
//     }

//     // 2. Prepare values
//     const remarks = batch_start
//       ? `Batch Start: ${batch_start}, Institute ID: ${institute_id}`
//       : null;

//     const amountPaid = typeof fees === "number" ? fees : 0.00;
//     const isEnrolledValue = typeof is_enrolled !== "undefined" ? is_enrolled : 0;

//     // 3. SQL Insert query for course_enrollments
//     const enrollmentQuery = `
//       INSERT INTO course_enrollments 
//       (course_id, user_id, enrollment_status, payment_status, amount_paid, remarks, is_enrolled) 
//       VALUES (?, ?, 'pending', 'pending', ?, ?, ?)
//     `;

//     mysqlcon.query(
//       enrollmentQuery,
//       [course_id, user_id, amountPaid, remarks, isEnrolledValue],
//       (err, result) => {
//         if (err) {
//           console.error("Insert Error:", err);
//           return res.status(400).json({
//             success: false,
//             message: "Failed to create enrollment",
//             error: err.message
//           });
//         }

//         const enrollmentId = result.insertId;
       

//         // 4. Update admissions table - only is_enrolled and enroll_user_id
//         if (institute_id && admission_id) {
//           const updateAdmissionsQuery = `
//             UPDATE admissions 
//             SET is_enrolled = ?, 
//                 enroll_user_id = ?
//             WHERE institute_id = ?
//             AND admission_id = ?
//           `;

//           // FIXED: Match the 4 placeholders with correct 4 values
//           mysqlcon.query(
//             updateAdmissionsQuery,
//             [isEnrolledValue, user_id, institute_id, admission_id], // CORRECTED THIS LINE
//             (err, updateResult) => {
//               if (err) {
//                 console.error("Admissions Update Error:", err);
//                 return res.status(500).json({
//                   success: false,
//                   message: "Enrollment created, but failed to update admission record",
//                   error: err.message
//                 });
//               }

             

//               console.log("Admissions update result:", updateResult);

//               // 5. Fetch the newly inserted enrollment record
//               mysqlcon.query(
//                 "SELECT * FROM course_enrollments WHERE id = ?",
//                 [enrollmentId],
//                 (err, enrollment) => {
//                   if (err) {
//                     console.error("Fetch Error:", err);
//                     return res.status(500).json({
//                       success: false,
//                       message: "Enrollment created and admission updated, but failed to fetch enrollment",
//                       error: err.message
//                     });
//                   }

//                   return res.status(201).json({
//                     success: true,
//                     message: updateResult.affectedRows > 0 
//                       ? "Enrollment created and admission updated successfully"
//                       : "Enrollment created successfully (no matching admission found)",
//                     data: enrollment[0],
//                     admissionUpdated: updateResult.affectedRows > 0
//                   });
//                 }
//               );
//             }
//           );
//         } else {
//           // If required fields for admission update are missing
          
//           mysqlcon.query(
//             "SELECT * FROM course_enrollments WHERE id = ?",
//             [enrollmentId],
//             (err, enrollment) => {
//               if (err) {
//                 console.error("Fetch Error:", err);
//                 return res.status(500).json({
//                   success: false,
//                   message: "Enrollment created, but failed to fetch it",
//                   error: err.message
//                 });
//               }

//               return res.status(201).json({
//                 success: true,
//                 message: "Enrollment created successfully (admission not updated - missing required fields)",
//                 data: enrollment[0],
//                 admissionUpdated: false
//               });
//             }
//           );
//         }
//       }
//     );
//   } catch (error) {
//     console.error("Unexpected Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to create enrollment",
//       error: error.message
//     });
//   }
// };

// Get single enrollment by ID
const getEnrollmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        e.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        c.name as course_name,
        c.duration as course_duration,
        c.description as course_description
      FROM course_enrollments e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.id = ?
    `;

    mysqlcon.query(query, [id], (err, enrollment) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch enrollment",
          error: err.message
        });
      }

      if (enrollment.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Enrollment fetched successfully",
        data: enrollment[0]
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment",
      error: error.message
    });
  }
};

// Get enrollments by user
const getUserEnrollments = async (req, res) => {
  const { userId } = req.params;

  try {
    const query = `
      SELECT 
        e.*,
        c.name as course_name,
        c.duration as course_duration,
        c.description as course_description
      FROM course_enrollments e
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC
    `;

    mysqlcon.query(query, [userId], (err, enrollments) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user enrollments",
          error: err.message
        });
      }

      return res.status(200).json({
        success: true,
        message: "User enrollments fetched successfully",
        data: enrollments
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user enrollments",
      error: error.message
    });
  }
};

// Update enrollment
const updateEnrollment = async (req, res) => {
  const { id } = req.params;
  const { 
    enrollment_status, 
    payment_status, 
    amount_paid, 
    remarks 
  } = req.body;

  try {
    // Check if enrollment exists
    mysqlcon.query('SELECT * FROM course_enrollments WHERE id = ?', [id], (err, existing) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to check enrollment",
          error: err.message
        });
      }

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found"
        });
      }

      const updates = [];
      const params = [];

      if (enrollment_status) {
        updates.push('enrollment_status = ?');
        params.push(enrollment_status);
        
        // Set enrollment_date when status changes to 'enrolled'
        if (enrollment_status === 'enrolled') {
          updates.push('enrollment_date = NOW()');
        }
      }

      if (payment_status) {
        updates.push('payment_status = ?');
        params.push(payment_status);
      }

      if (amount_paid !== undefined) {
        updates.push('amount_paid = ?');
        params.push(amount_paid);
      }

      if (remarks !== undefined) {
        updates.push('remarks = ?');
        params.push(remarks);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update"
        });
      }

      params.push(id);
      const query = `UPDATE course_enrollments SET ${updates.join(', ')} WHERE id = ?`;

      mysqlcon.query(query, params, (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "Failed to update enrollment",
            error: err.message
          });
        }

        // Fetch updated enrollment
        mysqlcon.query('SELECT * FROM course_enrollments WHERE id = ?', [id], (err, updated) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              success: false,
              message: "Failed to fetch updated enrollment",
              error: err.message
            });
          }

          return res.status(200).json({
            success: true,
            message: "Enrollment updated successfully",
            data: updated[0]
          });
        });
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update enrollment",
      error: error.message
    });
  }
};

// Update enrollment status
const updateEnrollmentStatus = async (req, res) => {
  const { id } = req.params;
  const { enrollment_status } = req.body;

  try {
    if (!enrollment_status) {
      return res.status(400).json({
        success: false,
        message: "Enrollment status is required"
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'enrolled', 'completed', 'cancelled'];
    if (!validStatuses.includes(enrollment_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment status"
      });
    }

    let query = 'UPDATE enrollments SET enrollment_status = ?';
    const params = [enrollment_status];

    // Set enrollment_date when status changes to 'enrolled'
    if (enrollment_status === 'enrolled') {
      query += ', enrollment_date = NOW()';
    }

    query += ' WHERE id = ?';
    params.push(id);

    mysqlcon.query(query, params, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to update enrollment status",
          error: err.message
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found"
        });
      }

      mysqlcon.query('SELECT * FROM enrollments WHERE id = ?', [id], (err, updated) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch updated enrollment",
            error: err.message
          });
        }

        return res.status(200).json({
          success: true,
          message: "Enrollment status updated successfully",
          data: updated[0]
        });
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update enrollment status",
      error: error.message
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status, amount_paid } = req.body;

  try {
    if (!payment_status) {
      return res.status(400).json({
        success: false,
        message: "Payment status is required"
      });
    }

    const validStatuses = ['pending', 'partial', 'paid', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status"
      });
    }

    const updates = ['payment_status = ?'];
    const params = [payment_status];

    if (amount_paid !== undefined) {
      updates.push('amount_paid = ?');
      params.push(amount_paid);
    }

    params.push(id);
    const query = `UPDATE enrollments SET ${updates.join(', ')} WHERE id = ?`;

    mysqlcon.query(query, params, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to update payment status",
          error: err.message
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found"
        });
      }

      mysqlcon.query('SELECT * FROM enrollments WHERE id = ?', [id], (err, updated) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch updated enrollment",
            error: err.message
          });
        }

        return res.status(200).json({
          success: true,
          message: "Payment status updated successfully",
          data: updated[0]
        });
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message
    });
  }
};

// Delete enrollment
const deleteEnrollment = async (req, res) => {
  const { id } = req.params;

  try {
    mysqlcon.query('DELETE FROM enrollments WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to delete enrollment",
          error: err.message
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Enrollment deleted successfully"
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete enrollment",
      error: error.message
    });
  }
};


// Get enrollment status for a specific user and course
const getEnrollmentStatus = async (req, res) => {
  const { userId, courseId } = req.params;

  try {
    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Course ID are required"
      });
    }

    // Check in admissions table if user is enrolled
    const query = `
      SELECT * FROM admissions 
      WHERE id = ? AND FIND_IN_SET(?, enroll_user_id) > 0
      LIMIT 1
    `;

    mysqlcon.query(query, [courseId, userId], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch enrollment status",
          error: err.message
        });
      }

      if (result.length === 0 || result[0].is_enrolled === 0) {
        return res.status(404).json({
          success: false,
          message: "No enrollment found",
          is_enrolled: false
        });
      }

      return res.status(200).json({
        success: true,
        is_enrolled: true,
        data: result[0]
      });
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment status",
      error: error.message
    });
  }
};

// Update admission with enrolled user
const updateAdmissionEnrollment = async (req, res) => {
  const { course_id, user_id } = req.body;

  try {
    if (!course_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Course ID and User ID are required"
      });
    }

    // First check if admission exists and get current enroll_user_id
    mysqlcon.query(
      'SELECT * FROM admissions WHERE id = ?',
      [course_id],
      (err, admission) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch admission",
            error: err.message
          });
        }

        if (admission.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Admission not found"
          });
        }

        const currentEnrollUsers = admission[0].enroll_user_id || '';
        
        // Check if user is already enrolled
        if (currentEnrollUsers.split(',').includes(String(user_id))) {
          return res.status(400).json({
            success: false,
            message: "User is already enrolled in this course"
          });
        }

        // Add user to enroll_user_id
        const updatedEnrollUsers = currentEnrollUsers 
          ? `${currentEnrollUsers},${user_id}` 
          : String(user_id);

        // Update admission
        const updateQuery = `
          UPDATE admissions 
          SET is_enrolled = 1, 
              enroll_user_id = ?,
              updated_at = NOW()
          WHERE id = ?
        `;

        mysqlcon.query(updateQuery, [updatedEnrollUsers, course_id], (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              success: false,
              message: "Failed to update enrollment",
              error: err.message
            });
          }

          return res.status(200).json({
            success: true,
            message: "Enrollment updated successfully",
            data: {
              course_id,
              user_id,
              is_enrolled: true
            }
          });
        });
      }
    );

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update enrollment",
      error: error.message
    });
  }
};


const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if id exists
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Admission ID is required"
      });
    }

    // Find admission by primary key (id)
    const admission = await admissions.findByPk(id);

    // Check if admission exists
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    // Return the admission data
    return res.status(200).json({
      success: true,
      data: admission
    });

  } catch (error) {
    console.error('Error fetching admission:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


// const getContacts = (req, res) => {
//   const { institute_id } = req.params;
  
//   // SQL query to fetch contacts with institute and users data
//   const query = `
//     SELECT 
//       c.id,
//       c.name AS contact_name,
//       c.email AS contact_email,
//       c.contact_no,
//       c.subject,
//       c.description,
//       c.createdAt AS contact_createdAt,
//       c.updatedAt AS contact_updatedAt,
//       c.user_id,
//       i.id AS institute_id,
//       i.username AS institute_username,
//       i.name AS institute_name,
//       i.email AS institute_email,
//       i.mobile AS institute_mobile,
//       i.logo AS institute_logo,
//       i.status AS institute_status,
//       u.id AS user_id,
//       u.username AS user_username,
//       u.email AS user_email,
//       u.display_name,
//       u.first_name,
//       u.middle_name,
//       u.last_name,
//       u.role,
//       u.phone AS user_phone,
//       u.avatar_url,
//       u.status AS user_status
//     FROM contacts c
//     LEFT JOIN institutes i ON c.institute_id = i.id
//     LEFT JOIN users u ON JSON_CONTAINS(c.user_id, CAST(u.id AS JSON), '$')
//     WHERE c.institute_id = ?
//     ORDER BY c.createdAt DESC
//   `;

//   mysqlcon.query(query, [institute_id], (error, contacts) => {
//     if (error) {
//       console.error('Error fetching contacts:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch contacts',
//         error: error.message
//       });
//     }

//     // Group contacts by contact_id to handle multiple users per contact
//     const groupedContacts = contacts.reduce((acc, row) => {
//       const contactId = row.id;
      
//       if (!acc[contactId]) {
//         acc[contactId] = {
//           id: row.id,
//           name: row.contact_name,
//           email: row.contact_email,
//           contact_no: row.contact_no,
//           subject: row.subject,
//           description: row.description,
//           createdAt: row.contact_createdAt,
//           updatedAt: row.contact_updatedAt,
//           institute: row.institute_id ? {
//             id: row.institute_id,
//             username: row.institute_username,
//             name: row.institute_name,
//             email: row.institute_email,
//             mobile: row.institute_mobile,
//             logo: row.institute_logo,
//             status: row.institute_status
//           } : null,
//           users: []
//         };
//       }

//       // Add user if exists and not already added
//       if (row.user_id && !acc[contactId].users.find(u => u.id === row.user_id)) {
//         acc[contactId].users.push({
//           id: row.user_id,
//           username: row.user_username,
//           email: row.user_email,
//           display_name: row.display_name,
//           first_name: row.first_name,
//           middle_name: row.middle_name,
//           last_name: row.last_name,
//           role: row.role,
//           phone: row.user_phone,
//           avatar_url: row.avatar_url,
//           status: row.user_status
//         });
//       }

//       return acc;
//     }, {});

//     // Convert to array
//     const result = Object.values(groupedContacts);

//     return res.status(200).json({
//       success: true,
//       count: result.length,
//       data: result
//     });
//   });
// };

const getContacts = (req, res) => {
  const { institute_id } = req.params;
  
  // SQL query to fetch contacts with institute and user data
  const query = `
    SELECT 
      c.id,
      c.name AS contact_name,
      c.email AS contact_email,
      c.contact_no,
      c.subject,
      c.description,
      c.message,
      c.createdAt AS contact_createdAt,
      c.updatedAt AS contact_updatedAt,
      c.user_id,
      c.institute_id,
      i.username AS institute_username,
      i.name AS institute_name,
      i.email AS institute_email,
      i.mobile AS institute_mobile,
      i.logo AS institute_logo,
      i.status AS institute_status,
      u.id AS user_id,
      u.username AS user_username,
      u.email AS user_email,
      u.display_name,
      u.first_name,
      u.middle_name,
      u.last_name,
      u.role,
      u.phone AS user_phone,
      u.avatar_url,
      u.status AS user_status
    FROM contacts c
    LEFT JOIN institutes i ON c.institute_id = i.id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.institute_id = ?
    ORDER BY c.createdAt DESC
  `;

  mysqlcon.query(query, [institute_id], (error, contacts) => {
    if (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch contacts',
        error: error.message
      });
    }

    // Format the response
    const result = contacts.map(row => ({
      id: row.id,
      name: row.contact_name,
      email: row.contact_email,
      contact_no: row.contact_no,
      subject: row.subject,
      description: row.description,
      message: row.message,
      createdAt: row.contact_createdAt,
      updatedAt: row.contact_updatedAt,
      institute: row.institute_id ? {
        id: row.institute_id,
        username: row.institute_username,
        name: row.institute_name,
        email: row.institute_email,
        mobile: row.institute_mobile,
        logo: row.institute_logo,
        status: row.institute_status
      } : null,
      user: row.user_id ? {
        id: row.user_id,
        username: row.user_username,
        email: row.user_email,
        display_name: row.display_name,
        first_name: row.first_name,
        middle_name: row.middle_name,
        last_name: row.last_name,
        role: row.role,
        phone: row.user_phone,
        avatar_url: row.avatar_url,
        status: row.user_status
      } : null
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  });
};



module.exports = {
  deleteEnrollment,
  getEnrollmentStatus,
  updateAdmissionEnrollment,
 updateEnrollment,
   getEnrollments,
  getEnrollmentById,
  getUserEnrollments,
  postEnrollment,
  updateAdmission,
  deleteAdmission,
  createAdmissions,
  getAdmissions,
  getAllAdmissions,
  getAdmissionById,
  getContacts
};
