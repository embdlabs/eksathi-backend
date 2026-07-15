const { mysqlcon } = require("../../model/db");
const { createDatabaseName } = require("../../routes/institutes/auth.service");
const { createUsername } = require("../../service/auth.service");

const {
  generatePasswordFromEmail,
} = require("../../utils/generateRandomPassword");
const { hashingPassword } = require("../../utils/validation");
const sendEmailService = require("../../utils/email");

const getInstitute = (req, res) => {
  try {
    mysqlcon.query(
      `SELECT id, username, name, mobile, email, logo, createdAt, status 
       FROM institutes 
       ORDER BY createdAt DESC`,
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json({
          message: "Institute found",
          result,
        });
      }
    );
  } catch (error) {
    console.error(error); // Fixed: was 'err', should be 'error'
    return res.status(409).json({ message: "Something went wrong" });
  }
};

const latestInstitute = (req, res) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  console.log("Last Date: ", oneWeekAgo);
  try {
    mysqlcon.query(
      "SELECT name, phone, email, logo, createdAt, country FROM institutes WHERE createdAt >= ?",
      [oneWeekAgo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        return res.status(200).json({
          message: "Latest Institute found",
          result,
        });
      }
    );
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// const createInstitute = async (req, res) => {
//   const { name, phone, email, logo } = req.body;

//   if (!name || !email || !phone || !country || !username) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }
// const {password} = generatePasswordFromEmail()
//  let hashpassword = await hashingPassword(password);
//  const generateUsername  = await createUsername()

//   const newUser = {
//     name,
//     email,
//     mobile:phone,
//     logo,
//     username:generateUsername,
//     password : hashpassword
//   };

//   mysqlcon.query(`INSERT INTO institutes SET ?`, newUser, (err, result) => {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//    sendWelcomeMail( email,
//   generateUsername,
//   role='institute',
//   profilelink,
//   firstName=name,
//   lastname=''
//   password = password
// )

//     return res
//       .status(201)
//       .json({ message: "Institute created successfully", id: result.insertId });
//   });
// };

// const createInstitute = async (req, res) => {
//   try {
//     const { name, phone, email } = req.body;

//     console.log("name", name);
//     console.log("phone", phone);
//     console.log("email", email);
//     // Validation
//     if (!name || !email || !phone) {
//       return res.status(400).json({
//         message: "Missing required fields",
//         required: ["name", "email", "phone", "country"],
//       });
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     // Phone validation
//     const phoneRegex = /^[0-9]{10}$/;
//     if (!phoneRegex.test(phone)) {
//       return res.status(400).json({
//         message: "Invalid phone number format. Must be 10 digits.",
//       });
//     }

//     // Check if email already exists
//     const emailCheckQuery = "SELECT id FROM institutes WHERE email = ?";
//     const emailExists = await new Promise((resolve, reject) => {
//       mysqlcon.query(emailCheckQuery, [email], (err, results) => {
//         if (err) reject(err);
//         resolve(results.length > 0);
//       });
//     });

//     const mobileCheckQuery = "SELECT id FROM institutes WHERE mobile = ?";
//     const mobileExists = await new Promise((resolve, reject) => {
//       mysqlcon.query(mobileCheckQuery, [phone], (err, results) => {
//         if (err) reject(err);
//         resolve(results.length > 0);
//       });
//     });

//     if (mobileExists) {
//       return res.status(409).json({
//         message: "Institute with this mobile number already exists",
//       });
//     }

//     if (emailExists) {
//       return res.status(409).json({
//         message: "Institute with this email already exists",
//       });
//     }

//     // Generate credentials
//     const password = await generatePasswordFromEmail(email);
//     const hashpassword = await hashingPassword(password);
//     const generateUsername = await createUsername(email);
//     const databaseName = await createDatabaseName(email);

//     // Prepare institute data
//     const newUser = {
//       name,
//       email,
//       mobile: phone,
//       username: generateUsername,
//       password: hashpassword,
//       status: "Verification", // Default status
//       database_name: databaseName,
//     };

//     // Insert into database
//     mysqlcon.query(
//       `INSERT INTO institutes SET ?`,
//       newUser,
//       async (err, result) => {
//         if (err) {
//           console.error("Database error:", err);

//           // Handle duplicate entry error
//           if (err.code === "ER_DUP_ENTRY") {
//             return res.status(409).json({
//               message: "Institute with this information already exists",
//             });
//           }

//           return res.status(500).json({
//             message: "Internal Server Error",
//             error:
//               process.env.NODE_ENV === "development" ? err.message : undefined,
//           });
//         }

//         // Generate profile link
//         const profileLink = `${
//           process.env.FRONTEND_URL || "http://localhost:3000"
//         }/institutes/institute-profile/${result.insertId}`;

//         // const resetUrl = `${
//         //   process.env.FRONTEND_URL || "http://localhost:3000"
//         // }/auth/password-reset/${token}`;

//         // Send welcome email
//         try {
//           await sendEmailService.sendWelcomeMail(
//             email,
//             generateUsername,
//             "institute",
//             profileLink,
//             name,
//             "",
//             password
//           );
//         } catch (emailError) {
//           console.error("Email sending failed:", emailError);
//           // Don't fail the request if email fails
//         }

//         // Return success response
//         return res.status(201).json({
//           message: "Institute created successfully",
//           data: {
//             id: result.insertId,
//             name,
//             email,
//             username: generateUsername,
//             status: "Verification",
//             profileLink,
//           },
//           // Only send password in development or if specifically needed
//           ...(process.env.NODE_ENV === "development" && {
//             credentials: { username: generateUsername, password },
//           }),
//         });
//       }
//     );
//   } catch (error) {
//     console.error("Error in createInstitute:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };


const createInstitute = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    console.log("name", name);
    console.log("phone", phone);
    console.log("email", email);

    // Validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["name", "email", "phone"],
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        message: "Invalid phone number format. Must be 10 digits.",
      });
    }

    // Check if email OR mobile already exists and get institute data if exists
    const duplicateCheckQuery = `
      SELECT id, name, email, mobile
      FROM institutes
      WHERE email = ? OR mobile = ?
    `;
    
    const existingInstitutes = await new Promise((resolve, reject) => {
      mysqlcon.query(duplicateCheckQuery, [email, phone], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });

    // Check if any duplicates exist
    if (existingInstitutes.length > 0) {
      const existingInstitute = existingInstitutes[0];
      const emailExists = existingInstitutes.some(inst => inst.email === email);
      const mobileExists = existingInstitutes.some(inst => inst.mobile == phone);

      // Determine appropriate error message
      let message;
      if (emailExists && mobileExists) {
        message = "Institute with this email and mobile number already exists";
      } else if (emailExists) {
        message = "Institute with this email already exists";
      } else {
        message = "Institute with this mobile number already exists";
      }

      // Send notification email to existing institute (non-blocking)
      sendEmailService.sendJobsEmail(
        existingInstitute.email,
        existingInstitute.name,
        "institute"
      ).catch(emailError => {
        console.error("Email sending failed:", emailError);
      });

      // Return response immediately without waiting for email
      return res.status(409).json({
        message: message,
        data: {
          id: existingInstitute.id,
          name: existingInstitute.name,
          email: existingInstitute.email,
        }
      });
    }

    // Generate credentials
    const password = await generatePasswordFromEmail(email);
    const hashpassword = await hashingPassword(password);
    const generateUsername = await createUsername(email);
    const databaseName = await createDatabaseName(email);

    // Prepare institute data
    const newUser = {
      name,
      email,
      mobile: phone,
      username: generateUsername,
      password: hashpassword,
      status: "Verification", // Default status
      database_name: databaseName,
    };

    // Insert into database
    mysqlcon.query(
      `INSERT INTO institutes SET ?`,
      newUser,
      async (err, result) => {
        if (err) {
          console.error("Database error:", err);

          // Handle duplicate entry error (shouldn't happen due to pre-check, but just in case)
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
              message: "Institute with this information already exists",
            });
          }

          return res.status(500).json({
            message: "Internal Server Error",
            error:
              process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }

        // Generate profile link
        const profileLink = `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/institutes/institute-profile/${result.insertId}`;

        // Send welcome email
        try {
          await sendEmailService.sendWelcomeMail(
            email,
            generateUsername,
            "institute",
            profileLink,
            name,
            "",
            password
          );
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
          // Don't fail the request if email fails
        }

        // Return success response
        return res.status(201).json({
          message: "Institute created successfully",
          data: {
            id: result.insertId,
            name,
            email,
            username: generateUsername,
            status: "Verification",
            profileLink,
          },
          // Only send password in development or if specifically needed
          ...(process.env.NODE_ENV === "development" && {
            credentials: { username: generateUsername, password },
          }),
        });
      }
    );
  } catch (error) {
    console.error("Error in createInstitute:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const testData = {
  name: "suraj kumar",
  phone: "6325458956",
  email: "surajkumar@yopmail.com",
};

// // Mock Express req and res objects
// const mockReq = {
//   body: testData
// };

// const mockRes = {
//   statusCode: null,
//   jsonData: null,
//   status: function(code) {
//     this.statusCode = code;
//     return this;
//   },
//   json: function(data) {
//     this.jsonData = data;
//     console.log(`\n📊 Response Status: ${this.statusCode}`);
//     console.log('📦 Response Data:', JSON.stringify(data, null, 2));
//     return this;
//   }
// };

// // Test execution
// (async () => {
//   try {
//     console.log('🚀 Starting institute creation test...\n');
//     console.log('📝 Test Data:', testData);

//     await createInstitute(mockReq, mockRes);

//     if (mockRes.statusCode === 201) {
//       console.log('\n✅ Test completed successfully!');
//     } else {
//       console.log('\n⚠️ Test completed with status:', mockRes.statusCode);
//     }

//     process.exit(0);
//   } catch (error) {
//     console.error('\n💥 Test failed:', error.message);
//     console.error('Stack:', error.stack);
//     process.exit(1);
//   }
// })();

// const updateInstitute = (req, res) => {
//   const instituteId = req.params.id || req.body.id; // Changed to camelCase to match common JavaScript conventions
//   const { name, phone, email ,status} = req.body;
//   console.log("Req.body is Updated ",req.body)
//   console.log("instituteId is ",instituteId)
//   const query =
//     "UPDATE institutes SET name = ?, mobile = ?, email = ? , status = ? WHERE id = ?";
//   const values = [name, phone, email,status, instituteId]; // Corrected order of values

//   try {
//     mysqlcon.query(query, values, (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ message: "Internal server error" });
//       }

//       if (result.affectedRows === 0) {
//         return res.status(404).json({ message: "Institute not found" });
//       }

//       return res
//         .status(200)
//         .json({ message: "Institute updated successfully" });
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

const updateInstitute = (req, res) => {
  const instituteId = req.params.id || req.body.id;
  const { name, mobile, email, status } = req.body;

  console.log("Req.body is Updated ", req.body);
  console.log("instituteId is ", instituteId);

  // Build dynamic query to only update provided fields
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name);
  }
  if (mobile !== undefined) {
    updates.push("mobile = ?");
    values.push(mobile);
  }
  if (email !== undefined) {
    updates.push("email = ?");
    values.push(email);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  values.push(instituteId); // Add ID at the end for WHERE clause

  const query = `UPDATE institutes SET ${updates.join(", ")} WHERE id = ?`;

  mysqlcon.query(query, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Institute not found" });
    }

    return res.status(200).json({
      message: "Institute updated successfully",
      updated: updates.length,
    });
  });
};

const deleteInstitute = (req, res) => {
  try {
    const { id } = req.params;

    const sql = "DELETE FROM institutes WHERE id=?";
    const values = [id];

    mysqlcon.query(sql, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to delete institutes" });
      }
      res.status(200).json({ message: "Institute deleted successfully" });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete institute" });
  }
};

const getInstituteByEmail = (req, res) => {
  const { email } = req.body;

  try {
    mysqlcon.query(
      `SELECT id, username, name, mobile, email, logo, createdAt, status FROM institutes WHERE email = ? ORDER BY createdAt DESC`,
      [email], // ✅ email parameter passed here
      (err, result) => {
        // ✅ callback arguments: (err, result)
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (result.length === 0) {
          return res
            .status(404)
            .json({ message: "No institute found with this email" });
        }

        return res.status(200).json({
          message: "Institute found",
          result,
        });
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ==================== JOB MANAGEMENT CONTROLLERS ====================

const getAllJobs = async (req, res) => {
  try {
    const { status, employment_type, search, page = 1, limit = 10 } = req.query;
    let query = `
      SELECT 
        j.*,
        i.name as institute_name,
        i.email as institute_email,
        i.mobile as institute_phone,
        jc.name as category_name,
        COUNT(DISTINCT ja.id) as applications_count
      FROM job_descriptions j
      LEFT JOIN institutes i ON j.institute_id = i.id
      LEFT JOIN job_categories jc ON j.job_category_id = jc.id
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      WHERE 1=1
    `;

    const params = [];

    // Status filter
    if (status && status !== "all") {
      query += ` AND j.status = ?`;
      params.push(status);
    }

    // Employment type filter
    if (employment_type && employment_type !== "all") {
      query += ` AND JSON_CONTAINS(j.employment_type, ?, '$')`;
      params.push(JSON.stringify(employment_type));
    }

    // Search filter
    if (search) {
      query += ` AND (j.job_title LIKE ? OR j.job_location LIKE ? OR i.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` GROUP BY j.id ORDER BY j.createdAt DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [jobs] = await mysqlcon.promise().query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT j.id) as total 
      FROM job_descriptions j
      LEFT JOIN institutes i ON j.institute_id = i.id
      WHERE 1=1
    `;
    const countParams = [];

    if (status && status !== "all") {
      countQuery += ` AND j.status = ?`;
      countParams.push(status);
    }

    if (employment_type && employment_type !== "all") {
      countQuery += ` AND JSON_CONTAINS(j.employment_type, ?, '$')`;
      countParams.push(JSON.stringify(employment_type));
    }

    if (search) {
      countQuery += ` AND (j.job_title LIKE ? OR j.job_location LIKE ? OR i.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [[{ total }]] = await mysqlcon
      .promise()
      .query(countQuery, countParams);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

const getJobStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'renewed' THEN 1 ELSE 0 END) as renewed,
        SUM(vacancies) as total_vacancies
      FROM jobs;
    `;

    const [[stats]] = await mysqlcon.promise().query(statsQuery);

    // Get total applications
    const [[{ total_applications }]] = await mysqlcon
      .promise()
      .query("SELECT COUNT(*) as total_applications FROM job_applications");

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        total_applications,
      },
    });
  } catch (error) {
    console.error("Get job stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch job statistics",
      error: error.message,
    });
  }
};

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        j.*,
        i.name as institute_name,
        i.email as institute_email,
        i.phone as institute_phone,
        i.location as institute_location,
        jc.name as category_name,
        COUNT(DISTINCT ja.id) as applications_count,
        COUNT(DISTINCT CASE WHEN ja.status = 'pending' THEN ja.id END) as pending_applications,
        COUNT(DISTINCT CASE WHEN ja.status = 'reviewed' THEN ja.id END) as reviewed_applications,
        COUNT(DISTINCT CASE WHEN ja.status = 'hired' THEN ja.id END) as hired_applications
      FROM jobs j
      LEFT JOIN institutes i ON j.institute_id = i.id
      LEFT JOIN job_categories jc ON j.job_category_id = jc.id
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      WHERE j.id = ?
      GROUP BY j.id;
    `;

    const [[job]] = await mysqlcon.promise().query(query, [id]);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Get job by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch job details",
      error: error.message,
    });
  }
};

const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if job exists
    const [[existingJob]] = await mysqlcon
      .promise()
      .query("SELECT * FROM jobs WHERE id = ?", [id]);

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Build update query dynamically
    const allowedFields = [
      "job_category_id",
      "job_title",
      "job_description",
      "employment_type",
      "work_schedule",
      "salary_range",
      "subjects",
      "minimum_qualification",
      "experience",
      "job_location",
      "designation",
      "vacancies",
      "special_note",
      "short_description",
      "expiry_date",
      "status",
    ];

    const updates = [];
    const values = [];

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = ?`);

        // Handle JSON fields
        if (["employment_type", "work_schedule"].includes(key)) {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Add updated timestamp
    updates.push("updatedAt = CURRENT_TIMESTAMP");
    values.push(id);

    const updateQuery = `UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`;

    await mysqlcon.promise().query(updateQuery, values);

    // Fetch updated job
    const [[updatedJob]] = await mysqlcon
      .promise()
      .query("SELECT * FROM jobs WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update job",
      error: error.message,
    });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if job exists
    const [[existingJob]] = await mysqlcon
      .promise()
      .query("SELECT * FROM jobs WHERE id = ?", [id]);

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Delete associated applications first
    await mysqlcon
      .promise()
      .query("DELETE FROM job_applications WHERE job_id = ?", [id]);

    // Delete the job
    await mysqlcon.promise().query("DELETE FROM jobs WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "Job and associated applications deleted successfully",
    });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: error.message,
    });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "active",
      "inactive",
      "expired",
      "renewed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    await mysqlcon
      .promise()
      .query(
        "UPDATE jobs SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [status, id]
      );

    res.status(200).json({
      success: true,
      message: "Job status updated successfully",
    });
  } catch (error) {
    console.error("Update job status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update job status",
      error: error.message,
    });
  }
};

module.exports = {
  getInstitute,
  latestInstitute,
  createInstitute,
  updateInstitute,
  deleteInstitute,
  getInstituteByEmail,
  getAllJobs,
  getJobStats,
  getJobById,
  updateJob,
  deleteJob,
  updateJobStatus,
};
