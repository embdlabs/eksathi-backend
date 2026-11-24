const { default: slugify } = require("slugify");
const { mysqlcon } = require("../model/db");
const { sequelize } = require("../model/db");
const { DBMODELS } = require("../models/init-models");
const { uid } = require("uid");
const { isJobAppliedByUser } = require("../service/utilities.service");
const { transporter } = require("../routes/institutes/department.controller");
const sendEmailService = require("../utils/email");
const initJobApplications = require("../models/job_applications");
const job_applications = initJobApplications(sequelize);
const { Op } = require("sequelize");
const { cachedQuery } = require("../utils/db-cache-wrapper");

const isStaffRole = (role) => ["admin", "superadmin"].includes(role);

const isJobRowExpired = (job) => {
  if (!job) return true;
  const status = String(job.status || "").toLowerCase();
  if (status && status !== "active") return true;
  const raw = job.expiry_date || job.end_date || null;
  if (!raw || raw === "0000-00-00 00:00:00") return false;
  const ts = new Date(raw);
  if (Number.isNaN(ts.getTime())) return false;
  const end = new Date(ts);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
};

/** Institute may only manage own jobs; admin/superadmin may manage any. */
const assertCanManageJob = async (req, jobId) => {
  const role = req.user?.role;
  if (isStaffRole(role)) return { ok: true };
  if (role !== "institute") {
    return {
      ok: false,
      status: 403,
      message: "Only institute or admin can manage jobs",
    };
  }
  const [rows] = await mysqlcon.promise().query(
    "SELECT id, institute_id, status, expiry_date FROM job_descriptions WHERE id = ? LIMIT 1",
    [jobId]
  );
  if (!rows.length) {
    return { ok: false, status: 404, message: "Job not found" };
  }
  if (String(rows[0].institute_id) !== String(req.user.id)) {
    return {
      ok: false,
      status: 403,
      message: "You can only manage your own institute jobs",
    };
  }
  return { ok: true, job: rows[0] };
};

// GET all job descriptions by institute ID
const getJobs = async (req, res) => {
  const instituteId = req.query.instituteId;
  try {
    let query = `SELECT jd.*, i.name as institute_name , i.logo as institute_logo FROM job_descriptions  jd
      LEFT JOIN institutes  i ON jd.institute_id = i.id`;
    const params = [];
    if (instituteId != null && instituteId !== "") {
      query += ` WHERE jd.institute_id = ?`;
      params.push(instituteId);
    }

    mysqlcon.query(query, params, async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      // Public list: hide expired unless institute dashboard (instituteId filter)
      const list =
        instituteId != null && instituteId !== ""
          ? results
          : results.filter((job) => !isJobRowExpired(job));

      // Single grouped count query — avoid N+1 per job
      let countMap = {};
      if (list.length > 0) {
        const ids = list.map((j) => j.id);
        const placeholders = ids.map(() => "?").join(",");
        const [countRows] = await mysqlcon.promise().query(
          `SELECT job_id, COUNT(*) AS totalApplications
           FROM job_applications
           WHERE job_id IN (${placeholders})
           GROUP BY job_id`,
          ids
        );
        countMap = (countRows || []).reduce((acc, row) => {
          acc[row.job_id] = Number(row.totalApplications) || 0;
          return acc;
        }, {});
      }

      const jobsWithApplications = list.map((job) => ({
        ...job,
        totalApplications: countMap[job.id] || 0,
      }));

      return res
        .status(200)
        .json({ message: "Jobs Found", results: jobsWithApplications });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getActiveJobs = (req, res) => {
  try {
    mysqlcon.query(
      `SELECT * FROM job_descriptions WHERE status='active' ORDER BY createdAt DESC;`,
      async (err, results) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        const active = (results || []).filter((job) => !isJobRowExpired(job));
        return res.status(200).json({ message: "Jobs Found", results: active });
      },
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getTotalJobs = async (req, res) => {
  try {
    const currentDate = new Date().toISOString();
    // mysqlcon.query(
    //   `SELECT jd.*, i.name as institute_name
    //    FROM job_descriptions jd
    //    JOIN institutes i ON jd.institute_id = i.id
    //    WHERE jd.status = 'active' and jd.start_date <= ?`,
    //   [currentDate],
    //   async (err, results) => {
    //   if (err) {
    //     console.log(err);
    //     return res.status(500).json({ message: "Internal Server Error" });
    //   }
    //   return res.status(200).json({ message: "Jobs Found", results });
    //   }
    // );
    const response = await DBMODELS.job_descriptions.findAll({
      where: {
        status: "active",
        createdAt: {
          [Op.lte]: currentDate,
        },
      },
      include: [
        {
          model: DBMODELS.institutes,
          as: "institutes",
          attributes: ["id", "name", "logo"],
        },
      ],
    });
    const now = Date.now();
    const results = (response || []).filter((job) => {
      const raw = job.expiry_date || job.end_date;
      if (!raw || raw === "0000-00-00 00:00:00") return true;
      const ts = new Date(raw);
      if (Number.isNaN(ts.getTime())) return true;
      const end = new Date(ts);
      end.setHours(23, 59, 59, 999);
      return end.getTime() >= now;
    });
    if (results.length > 0) {
      return res.status(200).json({ message: "Jobs Found", results });
    } else {
      return res.status(200).json({ message: "No Jobs Found", results: [] });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getallJobs = async (req, res) => {
  try {
    let cacheKey = "job_list";

    let result = await cachedQuery({
      cacheName: "lists",
      cacheKey: cacheKey,
      sql: `SELECT jd.*, i.name as institute_name 
       FROM job_descriptions jd
       JOIN institutes i ON jd.institute_id = i.id`, // Fixed: 'slq' to 'sql'
      params: [], // Added: empty params array
      ttl: 3600, // Optional: Add TTL if needed
    });
    // mysqlcon.query(
    //   `SELECT jd.*, i.name as institute_name
    //    FROM job_descriptions jd
    //    JOIN institutes i ON jd.institute_id = i.id`,
    //   async (err, results) => {
    //     if (err) {
    //       console.log(err);
    //       return res.status(500).json({ message: "Internal Server Error" });
    //     }
    //     return res.status(200).json({ message: "Jobs Found", results });
    //   }
    // );

    let results = (result.data || []).filter((job) => !isJobRowExpired(job));
    return res.status(200).json({ message: "Jobs Found", results });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//get all inactive jobs
const getInactiveJobs = (req, res) => {
  try {
    mysqlcon.query(
      `SELECT jd.*, i.name as institute_name 
       FROM job_descriptions jd
       JOIN institutes i ON jd.institute_id = i.id
       WHERE jd.status = 'inactive'`,
      async (err, results) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json({ message: "Jobs Found", results });
      },
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET a job description by job id
const getJob = (req, res) => {
  console.log(req.params);
  const jobId = req.params.id;
  try {
    mysqlcon.query(
      "SELECT * FROM job_descriptions WHERE id = ?",
      [jobId],
      async (err, results) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "Job description not found" });
        }
        // results[0].employment_type = JSON.parse(results[0].employment_type);
        // results[0].work_schedule = JSON.parse(results[0].work_schedule);
        // results[0].subjects = JSON.parse(results[0].subjects);
        // results[0].minimum_qualification = JSON.parse(results[0].minimum_qualification);

        const institute = await DBMODELS.institutes.findOne({
          where: { id: results[0].institute_id },
          attributes: ["id", "name", "logo"],
        });

        results[0] = { ...results[0], institute };
        return res.status(200).json({
          message: "Job description Found",
          result: results[0],
        });
      },
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getJobBySlug = async (req, res) => {
  const slug = req.params.slug;

  try {
    // Use a promise-based approach for the MySQL query
    let jobDescriptions = await new Promise((resolve, reject) => {
      mysqlcon.query(
        "SELECT * FROM job_descriptions WHERE slug = ?",
        [slug],
        (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) return resolve(null);
          resolve(results);
        },
      );
    });

    if (!jobDescriptions) {
      return res.status(404).json({ message: "Job description not found" });
    }

    const institute = await DBMODELS.institutes.findOne({
      where: { id: jobDescriptions[0].institute_id },
      attributes: ["id", "name", "logo"],
    });

    // let isApplied = false;
    // if (userId) {
    //   isApplied = await isJobAppliedByUser(userId, jobDescriptions[0].id);
    // }

    jobDescriptions = { ...jobDescriptions[0], institute };

    return res.status(200).json({
      message: "Job description found",
      result: jobDescriptions,
    });
  } catch (err) {
    console.error("Error fetching job description:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST a new job description
// const addJob = (req, res) => {
//   const {
//     institute_id,
//     job_title,
//     job_description,
//     employment_type,
//     work_schedule,
//     salary_range,
//     subjects,
//     minimum_qualification,
//     experience,
//     job_location,
//     designation,
//     vacancies,
//     special_note,
//     category_id,
//     role
//   } = req.body;
//   const start_date = req.body.start_date;
//   const expiry_date = req.body.end_date;
//   const name = req.body.name;
//   const email = req.body.email;
//   const phone = req.body.phone;

//   console.log("req.bodt is ",req.body)

//   // console.log("REq.body s ",req.body)
//   // Check if the user has the role of "institute"
//  if (!['institute', 'admin','superadmin'].includes(role)) {
//   return res.status(403).json({
//     message: 'Only users with the role of "institute" ,"admin","superadmin" can post a new job'
//   });
// }
//   let slug =
//     slugify(
//       job_title.toLowerCase().replaceAll(`[^a-zA-Z0-9()!@#$%^&*|\<>,./?_]`, "-")
//     ) + uid(5);

//   try {
//     const query =
//       "INSERT INTO job_descriptions (slug,institute_id,name,email,phone, job_title, job_description, employment_type, work_schedule, salary_range, subjects, minimum_qualification, experience, job_location, designation, vacancies, special_note,createdAt,expiry_date, job_category_id, status) VALUES (?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)";
//     const values = [
//       slug,
//       institute_id,
//       name,
//       email,
//       phone,
//       job_title,
//       job_description,
//       JSON.stringify(employment_type),
//       JSON.stringify(work_schedule),
//       salary_range,
//       JSON.stringify(subjects),
//       JSON.stringify(minimum_qualification),
//       experience,
//       job_location,
//       designation,
//       vacancies,
//       special_note,
//       start_date,
//       expiry_date,
//       category_id,
//       "active",
//     ];
//     mysqlcon.query(query, values, (err, results) => {
//       if (err) {
//         console.log("This is error posting", err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }
//       return res
//         .status(200)
//         .json({ message: "Job description created successfully" });
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const addJob = (req, res) => {
//   const {
//     institute_id,
//     job_title,
//     job_description,
//     employment_type,
//     work_schedule,
//     salary_range,
//     subjects,
//     minimum_qualification,
//     experience,
//     job_location,
//     designation,
//     vacancies,
//     special_note,
//     category_id,
//     role,
//   } = req.body;
//   const start_date = req.body.start_date;
//   const expiry_date = req.body.end_date;
//   const name = req.body.name;
//   const email = req.body.email;
//   const phone = req.body.phone;

//   console.log("req.body is ", req.body);

//   console.log("req.body is ", req.body);

//   // Check if the user has the role of "institute", "admin", or "superadmin"
//   if (!["institute", "admin", "superadmin"].includes(role)) {
//     return res.status(403).json({
//       message:
//         'Only users with the role of "institute", "admin", "superadmin" can post a new job',
//     });
//   }

//   let slug =
//     slugify(
//       job_title.toLowerCase().replaceAll(`[^a-zA-Z0-9()!@#$%^&*|\<>,./?_]`, "-")
//     ) + uid(5);

//   try {
//     // First, fetch institute details
//     const instituteQuery =
//       "SELECT email, username, name FROM institutes WHERE id = ?";

//     mysqlcon.query(instituteQuery, [institute_id], (err, instituteResults) => {
//       if (err) {
//         console.log("Error fetching institute details:", err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }

//       if (instituteResults.length === 0) {
//         return res.status(404).json({ message: "Institute not found" });
//       }

//       const instituteData = instituteResults[0];
//       // console.log("==========================================");
//       // console.log("Institute Details:");
//       // console.log("Email:", instituteData.email);
//       // console.log("Username:", instituteData.username);
//       // console.log("Institute Name:", instituteData.institute_name);
//       // console.log("==========================================");

//       // Now insert the job description
//       const query =
//         "INSERT INTO job_descriptions (slug, institute_id, name, email, phone, job_title, job_description, employment_type, work_schedule, salary_range, subjects, minimum_qualification, experience, job_location, designation, vacancies, special_note, createdAt, expiry_date, job_category_id, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

//       const values = [
//         slug,
//         institute_id,
//         name,
//         email,
//         phone,
//         job_title,
//         job_description,
//         JSON.stringify(employment_type),
//         JSON.stringify(work_schedule),
//         salary_range,
//         JSON.stringify(subjects),
//         JSON.stringify(minimum_qualification),
//         experience,
//         job_location,
//         designation,
//         vacancies,
//         special_note,
//         start_date,
//         expiry_date,
//         category_id,
//         "active",
//       ];

//       mysqlcon.query(query, values, (err, results) => {
//         if (err) {
//           console.log("Error posting job:", err);
//           return res.status(500).json({ message: "Internal Server Error" });
//         }

//         // TODO: Send email to institute here using instituteData
//         // You can use the email template here with:
//         // - instituteData.email
//         // - instituteData.username
//         // - instituteData.institute_name

//         sendEmailService.sendJobsEmail(
//           instituteData.email,
//           instituteData.name,
//           role
//         );

//         return res.status(200).json({
//           message: "Job description created successfully",
//           instituteDetails: {
//             email: instituteData.email,
//             username: instituteData.username,
//             instituteName: instituteData.institute_name,
//           },
//         });
//       });
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// NEW

const addJob = (req, res) => {
  const {
    institute_id,
    job_title,
    job_description,
    employment_type,
    work_schedule,
    salary_range,
    subjects,
    minimum_qualification,
    experience,
    job_location,
    designation,
    vacancies,
    special_note,
    category_id,
  } = req.body;
  const start_date = req.body.start_date;
  const expiry_date = req.body.end_date;
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;

  // Role from JWT only — ignore spoofable body.role
  const role = req.user?.role;
  if (!["institute", "admin", "superadmin"].includes(role)) {
    return res.status(403).json({
      message:
        'Only users with the role of "institute", "admin", "superadmin" can post a new job',
    });
  }
  // Institutes always post as themselves; staff may pass institute_id
  const boundInstituteId =
    role === "institute" ? req.user.id : institute_id;
  if (boundInstituteId == null || boundInstituteId === "") {
    return res.status(400).json({ message: "institute_id is required" });
  }

  let slug =
    slugify(
      job_title
        .toLowerCase()
        .replaceAll(`[^a-zA-Z0-9()!@#$%^&*|\<>,./?_]`, "-"),
    ) + uid(5);

  try {
    // First, fetch institute details
    const instituteQuery =
      "SELECT email, username, name FROM institutes WHERE id = ?";

    mysqlcon.query(instituteQuery, [boundInstituteId], (err, instituteResults) => {
      if (err) {
        console.log("Error fetching institute details:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (instituteResults.length === 0) {
        return res.status(404).json({ message: "Institute not found" });
      }

      const instituteData = instituteResults[0];

      // Now insert the job description
      const jobQuery =
        "INSERT INTO job_descriptions (slug, institute_id, name, email, phone, job_title, job_description, employment_type, work_schedule, salary_range, subjects, minimum_qualification, experience, job_location, designation, vacancies, special_note, createdAt, expiry_date, job_category_id, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

      const jobValues = [
        slug,
        boundInstituteId,
        name,
        email,
        phone,
        job_title,
        job_description,
        JSON.stringify(employment_type),
        JSON.stringify(work_schedule),
        salary_range,
        JSON.stringify(subjects),
        JSON.stringify(minimum_qualification),
        experience,
        job_location,
        designation,
        vacancies,
        special_note,
        start_date,
        expiry_date,
        category_id,
        "active",
      ];

      mysqlcon.query(jobQuery, jobValues, (err, jobResults) => {
        if (err) {
          console.log("Error posting job:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        // Get the inserted job ID
        const jobId = jobResults.insertId;

        // Now insert the question record with isPost = 1
        const questionSlug = slug + "-questions-" + uid(5);
        const questionTitle = `Job Application Questions for ${job_title}`;
        const questionBody = `This post contains questions related to the job posting: ${job_title}.`;
        const questionBrief = `Questions and application details for ${job_title} position at ${instituteData.name}.`;

        // Prepare tags from job details
        const questionTags = JSON.stringify({
          job_id: jobId,
          job_title: job_title,
          institute_id: institute_id,
          institute_name: instituteData.name,
          employment_type: employment_type,
          job_location: job_location,
          category: category_id,
        });

        // Insert into questions table
        const questionQuery = `
          INSERT INTO questions (
            title, slug, tags, category_id, body, isPost, img, 
            notification, is_answered, user_id, is_hidden, brief, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const questionValues = [
          questionTitle,
          questionSlug,
          questionTags,
          category_id,
          questionBody,
          1, // isPost = 1
          null, // img - can be null or set to default
          "job_post", // notification type
          "pending", // is_answered status
          institute_id, // user_id - using institute_id as user_id
          0, // is_hidden = 0 (visible)
          questionBrief,
          new Date(), // createdAt
        ];

        mysqlcon.query(
          questionQuery,
          questionValues,
          (err, questionResults) => {
            if (err) {
              console.log("Error inserting question record:", err);
              // You might want to handle this error differently
              // For now, we'll continue and send the email even if question insertion fails
              console.log("Job created but question record insertion failed");
            } else {
              console.log(
                "Question record created with ID:",
                questionResults.insertId,
              );
            }

            // Send email to institute
            sendEmailService.sendJobsEmail(
              instituteData.email,
              instituteData.name,
              role,
            );

            return res.status(200).json({
              message: "Job description created successfully",
              jobId: jobId,
              questionId: questionResults ? questionResults.insertId : null,
              instituteDetails: {
                email: instituteData.email,
                username: instituteData.username,
                instituteName: instituteData.name,
              },
            });
          },
        );
      });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// PUT (update) a job description by ID
const updateJob = async (req, res) => {
  const jobId = req.params.id;
  const {
    name,
    email,
    phone,
    institute_id,
    job_title,
    job_description,
    employment_type,
    work_schedule,
    salary_range,
    subjects,
    minimum_qualification,
    experience,
    job_location,
    designation,
    vacancies,
    special_note,
  } = req.body;
  const start_date = req.body.start_date;
  const end_date = req.body.end_date;

  try {
    const gate = await assertCanManageJob(req, jobId);
    if (!gate.ok) {
      return res.status(gate.status).json({ message: gate.message });
    }
    // Institutes cannot reassign ownership
    const nextInstituteId =
      req.user?.role === "institute"
        ? req.user.id
        : institute_id != null
          ? institute_id
          : gate.job?.institute_id;

    const query =
      "UPDATE job_descriptions SET name = ?, email = ?, phone = ?, institute_id = ?, job_title = ?, job_description = ?, employment_type = ?, work_schedule = ?, salary_range = ?, subjects = ?, minimum_qualification = ?, experience = ?, job_location = ?, designation = ?, vacancies = ?, special_note = ? ,createdAt = ?,expiry_date=? WHERE id = ?";
    const values = [
      name,
      email,
      phone,
      nextInstituteId,
      job_title,
      job_description,
      JSON.stringify(employment_type),
      JSON.stringify(work_schedule),
      salary_range,
      JSON.stringify(subjects),
      JSON.stringify(minimum_qualification),
      experience,
      job_location,
      designation,
      vacancies,
      special_note,
      start_date,
      end_date,
      jobId,
    ];

    mysqlcon.query(query, values, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      return res
        .status(200)
        .json({ message: "Job description updated successfully" });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE a job description by ID
const deleteJob = async (req, res) => {
  const jobId = req.params.id;

  try {
    const gate = await assertCanManageJob(req, jobId);
    if (!gate.ok) {
      return res.status(gate.status).json({ message: gate.message });
    }
    mysqlcon.query(
      "DELETE FROM job_descriptions WHERE id = ?",
      [jobId],
      (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        return res
          .status(200)
          .json({ message: "Job description deleted successfully" });
      },
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET all job categories
const getJobCategories = (req, res) => {
  const query = "SELECT * FROM job_categories";

  try {
    mysqlcon.query(query, (err, results) => {
      if (err) {
        console.error("Error retrieving job categories:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      res.status(200).json(results);
    });
  } catch (err) {
    console.error("Error retrieving job categories:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET a job category by ID
const getJobCategory = (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM job_categories WHERE id = ?";
  const values = [id];

  try {
    mysqlcon.query(query, values, (err, results) => {
      if (err) {
        console.error("Error retrieving job category:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Job category not found" });
      }

      res.status(200).json(results[0]);
    });
  } catch (err) {
    console.error("Error retrieving job category:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// CREATE a new job category
const addJobCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existCategoryQuery = "SELECT * FROM job_categories where name = ?";
    const [existCategoryResult] = await mysqlcon
      .promise()
      .query(existCategoryQuery, [name]);
    if (existCategoryResult.length > 0) {
      return res.status(403).json({ message: "Job Category already exist" });
    }
    const query =
      "INSERT INTO job_categories (name, description) VALUES (?, ?)";
    const values = [name, description];

    mysqlcon.query(query, values, (err, results) => {
      if (err) {
        console.error("Error creating job category:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      res.status(201).json({ message: "Job category created successfully" });
    });
  } catch (err) {
    console.error("Error creating job category:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// UPDATE a job category
const updateJobCategory = (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const query =
      "UPDATE job_categories SET name = ?, description = ? WHERE id = ?";
    const values = [name, description, id];

    mysqlcon.query(query, values, (err, results) => {
      if (err) {
        console.error("Error updating job category:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Job category not found" });
      }

      res.status(200).json({ message: "Job category updated successfully" });
    });
  } catch (err) {
    console.error("Error updating job category:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE a job category
const deleteJobCategory = (req, res) => {
  const { id } = req.params;

  try {
    const query = "DELETE FROM job_categories WHERE id = ?";
    const values = [id];

    mysqlcon.query(query, values, (err, results) => {
      if (err) {
        console.error("Error deleting job category:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Job category not found" });
      }

      res.status(200).json({ message: "Job category deleted successfully" });
    });
  } catch (err) {
    console.error("Error deleting job category:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET all job descriptions grouped by categories
const getJobDescriptionsByCategory = (req, res) => {
  try {
    const query = `
      SELECT jc.id AS category_id, jc.name AS category_name, jc.description AS category_description, 
      jd.id AS job_id, jd.job_title, jd.slug AS slug, jd.job_location, jd.job_description, jd.salary_range, jd.employment_type, jd.expiry_date
      FROM job_categories jc
      LEFT JOIN job_descriptions jd ON jc.id = jd.job_category_id
      WHERE jd.status = 'active' AND jd.job_category_id = jc.id
      ORDER BY jc.id, jd.id
    `;

    mysqlcon.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      // Transform the result into the desired format (grouped by categories)
      const jobDescriptionsByCategory = {};
      results.forEach((row) => {
        const categoryId = row.category_id;
        const categoryName = row.category_name;
        const categoryDescription = row.category_description;

        // Convert employment_type to string and split
        const employmentType = JSON.stringify(row.employment_type);
        const jobDescription = {
          id: row?.job_id,
          jobTitle: row.job_title,
          jobDescription: row.job_description,
          salary: row.salary_range,
          empType: employmentType && JSON.parse(employmentType)[0],
          slug: row.slug,
          job_location: row.job_location,
          expiry: row.expiry_date,
        };

        if (!jobDescriptionsByCategory[categoryId]) {
          jobDescriptionsByCategory[categoryId] = {
            categoryId,
            categoryName,
            categoryDescription,
            jobDescriptions: [],
          };
        }

        jobDescriptionsByCategory[categoryId].jobDescriptions.push(
          jobDescription,
        );
      });

      const groupedJobDescriptions = Object.values(jobDescriptionsByCategory);
      return res
        .status(200)
        .json({ message: "Jobs fetched", groupedJobDescriptions });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllJobApplications = async (req, res) => {
  try {
    if (!isStaffRole(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const jobApplication = await DBMODELS.job_applications.findAll({
      attributes: ["id", "status", "createdAt"],
      include: [
        {
          model: DBMODELS.users,
          as: "users",
          attributes: [
            "id",
            "username",
            "email",
            "role",
            "first_name",
            "last_name",
            "phone",
            "bio",
            "avatar_url",
          ],
        },
        {
          model: DBMODELS.job_descriptions,
          as: "job_descriptions",
          attributes: ["id", "job_title"],
        },
      ],
    });

    return res.status(200).json(jobApplication);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllJobApplicationsByJobDescriptions = async (req, res) => {
  const jobDescriptionId = req.params.jobDescriptionId;
  try {
    const gate = await assertCanManageJob(req, jobDescriptionId);
    if (!gate.ok) {
      return res.status(gate.status).json({ message: gate.message });
    }
    const jobApplications = await DBMODELS.job_applications.findAll({
      where: { job_id: jobDescriptionId },
      include: [
        {
          model: DBMODELS.users,
          as: "users",
          attributes: [
            "id",
            "username",
            "email",
            "role",
            "first_name",
            "last_name",
            "phone",
            "bio",
            "avatar_url",
          ],
        },
        {
          model: DBMODELS.job_descriptions,
          as: "job_descriptions",
          attributes: ["id", "job_title"],
        },
      ],
    });
    return res.status(200).json(jobApplications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllJobApplicationsByApplicantId = async (req, res) => {
  const applicantId = req.params.applicantId;
  try {
    if (
      !isStaffRole(req.user?.role) &&
      String(applicantId) !== String(req.user?.id)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const jobApplications = await DBMODELS.job_applications.findAll({
      where: { user_id: applicantId, is_applied: true },
      include: [
        {
          model: DBMODELS.job_descriptions,
          as: "job_descriptions",
          attributes: ["id", "job_title", "employment_type", "slug"],
          include: [
            {
              model: DBMODELS.institutes,
              as: "institutes",
              attributes: ["id", "name", "logo"],
            },
          ],
        },
      ],
    });
    return res.status(200).json(jobApplications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllJobApplicationsByInstitute = async (req, res) => {
  const instituteId = req.params.instituteId;
  try {
    if (
      !isStaffRole(req.user?.role) &&
      !(
        req.user?.role === "institute" &&
        String(instituteId) === String(req.user?.id)
      )
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }
    // Step 1: Get total job descriptions by institute_id
    const totalJobDescriptions = await DBMODELS.job_descriptions.count({
      where: { institute_id: instituteId },
    });

    // Step 2: Get job applications with user details and job descriptions
    const jobApplications = await DBMODELS.job_applications.findAll({
      include: [
        {
          model: DBMODELS.users,
          as: "users",
          attributes: [
            "id",
            "username",
            "email",
            "role",
            "first_name",
            "last_name",
            "phone",
            "bio",
            "avatar_url",
          ],
        },
        {
          model: DBMODELS.job_descriptions,
          as: "job_descriptions",
          attributes: ["id", "job_title"],
          where: { institute_id: instituteId },
        },
      ],
    });

    // Step 3: Calculate job counts and applications per user
    const userJobCounts = jobApplications.reduce((acc, job) => {
      const userId = job.users.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: job.users,
          jobCount: 0,
          jobApplications: [],
        };
      }
      acc[userId].jobCount++;
      acc[userId].jobApplications.push({
        jobId: job.job_id,
        jobTitle: job.job_descriptions.job_title,
        status: job.status,
        createdAt: job.createdAt,
      });
      return acc;
    }, {});

    const jobApplication = Object.values(userJobCounts);

    return res
      .status(200)
      .json({ totalJobDescriptions, jobApplications, jobApplication });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getJobApplication = async (req, res) => {
  const applicationId = req.params.applicationId;
  try {
    const jobApplication = await DBMODELS.job_applications.findByPk(
      applicationId,
      {
        include: [
          {
            model: DBMODELS.users,
            as: "users",
            attributes: [
              "id",
              "username",
              "email",
              "role",
              "first_name",
              "last_name",
              "phone",
              "bio",
              "avatar_url",
            ],
          },
          {
            model: DBMODELS.job_descriptions,
            as: "job_descriptions",
            attributes: ["id", "job_title"],
          },
        ],
      },
    );

    if (!jobApplication) {
      return res.status(404).json({ message: "Job application not found" });
    }

    const isApplicant =
      String(jobApplication.user_id) === String(req.user?.id);
    if (!isStaffRole(req.user?.role) && !isApplicant) {
      const gate = await assertCanManageJob(req, jobApplication.job_id);
      if (!gate.ok) {
        return res.status(gate.status).json({ message: gate.message });
      }
    }

    return res.status(200).json(jobApplication);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const createApplication = async (req, res) => {
  try {
    // Applicant identity from JWT only — ignore spoofable body.user_id
    const user_id = req.user?.id;
    const { job_id, cover_letter } = req.body;
    if (!user_id || !job_id || !cover_letter) {
      return res.status(400).json({
        message: "Missing required fields: job_id, cover_letter (auth required)",
      });
    }

    // MVP: pure students cannot apply; dual (offers_teaching) same as teacher/pro
    // Block under-18 (fail closed on gate errors)
    try {
      const applicant = await DBMODELS.users.findByPk(user_id, {
        attributes: ["id", "role"],
      });
      if (!applicant) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const profile = await DBMODELS.user_profiles.findOne({
        where: { user_id },
        attributes: ["dob", "offers_teaching"],
      });
      if (applicant.role === "student") {
        const dual =
          profile?.offers_teaching === true ||
          profile?.offers_teaching === 1 ||
          profile?.offers_teaching === "1";
        if (!dual) {
          return res.status(403).json({
            message:
              "Students cannot apply for jobs. Use Wall, tutors, and institutes instead.",
          });
        }
      }
      if (profile?.dob) {
        const d = new Date(profile.dob);
        if (!Number.isNaN(d.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - d.getFullYear();
          const m = today.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
          if (age < 18) {
            return res.status(403).json({
              message: "You must be 18 or older to apply for jobs.",
            });
          }
        }
      }
    } catch (gateErr) {
      console.error("Job apply role/age gate:", gateErr);
      return res.status(503).json({
        message: "Unable to verify eligibility to apply. Please try again.",
      });
    }

    // Reject missing / inactive / expired jobs
    const [jobRows] = await mysqlcon.promise().query(
      `SELECT id, status, expiry_date FROM job_descriptions WHERE id = ? LIMIT 1`,
      [job_id]
    );
    const jobRow = jobRows[0];
    if (!jobRow) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (isJobRowExpired(jobRow)) {
      return res.status(403).json({
        message: "This job is no longer accepting applications.",
      });
    }

    // Check if the application already exists
    const existingApplication = await DBMODELS.job_applications.findOne({
      where: { user_id, job_id },
    });

    if (existingApplication) {
      if (existingApplication.is_applied) {
        return res
          .status(409)
          .json({ message: "Already applied to this job." });
      } else {
        existingApplication.is_applied = true;
        existingApplication.cover_letter = cover_letter;
        await existingApplication.save();
        try {
          const { sendJobApplicationAck } = require("../utils/transactionalMails");
          const [users] = await mysqlcon.promise().query(
            `SELECT email, first_name, last_name FROM users WHERE id = ? LIMIT 1`,
            [user_id]
          );
          const [jobs] = await mysqlcon.promise().query(
            `SELECT job_title, designation FROM job_descriptions WHERE id = ? LIMIT 1`,
            [job_id]
          );
          const u = users[0];
          const j = jobs[0];
          if (u?.email) {
            sendJobApplicationAck({
              email: u.email,
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
              jobTitle: j?.job_title || j?.designation || "the role",
            });
          }
        } catch (_) {
          /* non-blocking */
        }
        return res.status(200).json({
          message: "Job application updated to applied.",
          application: existingApplication,
        });
      }
    }

    // Create new job application
    const newJobApplication = await DBMODELS.job_applications.create({
      user_id,
      job_id,
      cover_letter,
      is_applied: true,
    });

    // Best-effort application ack email to candidate
    try {
      const { sendJobApplicationAck } = require("../utils/transactionalMails");
      const [users] = await mysqlcon.promise().query(
        `SELECT email, first_name, last_name FROM users WHERE id = ? LIMIT 1`,
        [user_id]
      );
      const [jobs] = await mysqlcon.promise().query(
        `SELECT job_title, designation FROM job_descriptions WHERE id = ? LIMIT 1`,
        [job_id]
      );
      const u = users[0];
      const j = jobs[0];
      if (u?.email) {
        sendJobApplicationAck({
          email: u.email,
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
          jobTitle: j?.job_title || j?.designation || "the role",
        });
      }
    } catch (_) {
      /* non-blocking */
    }

    // Respond with the created application
    return res.status(201).json(newJobApplication);
  } catch (error) {
    console.error("Error creating job application:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const addToWishlist = async (req, res) => {
  try {
    // Identity from JWT only
    const user_id = req.user?.id;
    const { job_id } = req.body;
    if (!user_id || !job_id) {
      return res.status(400).json({
        message: "Missing required fields: job_id (auth required)",
      });
    }

    // Check if the application already exists
    const existingApplication = await DBMODELS.job_applications.findOne({
      where: { user_id, job_id },
    });

    if (existingApplication) {
      if (existingApplication.wishlists) {
        return res.status(409).json({ message: "Already added to wishlist." });
      } else {
        existingApplication.wishlists = true;
        await existingApplication.save();
        return res.status(200).json({
          message: "Job successfully added to wishlist.",
          application: existingApplication,
        });
      }
    }

    // Create new job application
    const newJobApplication = await DBMODELS.job_applications.create({
      user_id,
      job_id,
      wishlists: true,
    });

    // Respond with the created application
    return res.status(201).json({
      message: "Job successfully added to wishlist.",
      application: newJobApplication,
    });
  } catch (error) {
    console.error("Error adding job to wishlist:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

const removeWishList = async (req, res) => {
  try {
    const { jobId } = req.params;
    const user_id = req.user?.id;
    const job_id = jobId;
    if (!user_id || !job_id) {
      return res.status(400).json({
        message: "Missing required fields: jobId (auth required)",
      });
    }
    // Path userId (if present) must match JWT
    if (
      req.params.userId != null &&
      String(req.params.userId) !== String(user_id)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }
    // Check if the application already exists
    const existingApplication = await DBMODELS.job_applications.findOne({
      where: { user_id, job_id },
    });

    if (existingApplication) {
      // // Check if the user has already applied for the job
      // if (existingApplication.is_applied === true) {
      //   return res.status(409).json({ message: "You have already applied for this job." });
      // }

      // Check if the job is in the user's wishlist
      if (existingApplication.wishlists) {
        existingApplication.wishlists = false;
        await existingApplication.save();
        return res.status(200).json({
          message: "Job removed from wishlist.",
          application: existingApplication,
        });
      } else {
        return res.status(409).json({ message: "not Exist in wishlist." });
      }
    } else {
      // If no application exists, create a new one with wishlists set to false
      const newApplication = await DBMODELS.job_applications.create({
        user_id,
        job_id,
        wishlists: false,
      });
      return res.status(200).json({
        message: "Job removed from wishlist.",
        application: newApplication,
      });
    }
  } catch (error) {
    console.error("Error Removing job to wishlist:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  const { applicationId } = req.params;
  const { newStatus } = req.body;

  try {
    const application = await DBMODELS.job_applications.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Only owning institute (or staff) may change status
    if (!isStaffRole(req.user?.role)) {
      const gate = await assertCanManageJob(req, application.job_id);
      if (!gate.ok) {
        return res.status(gate.status).json({ message: gate.message });
      }
    }

    const validStatuses = [
      "pending",
      "reviewed",
      "rejected",
      "hired",
      "in-progress",
      "hold",
    ];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await application.update({ status: newStatus });

    res
      .status(200)
      .json({ message: "Application status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
//approve a job
const Approvejob = async (req, res) => {
  const { id } = req.params;
  const updateQuery =
    "UPDATE job_descriptions SET status = 'active' WHERE id = ?";

  try {
    const [results] = await mysqlcon.promise().query(updateQuery, [id]);
    if (results.affectedRows > 0) {
      res.status(200).json({ message: "Job approved successfully" });
    } else {
      res.status(404).json({ message: "Job not found" });
    }
  } catch (error) {
    console.error("Error approving job:", error);
    res
      .status(500)
      .json({ message: "An error occurred while approving the job" });
  }
};
//send notification to institute
const sendNotificationToInstitution = async (institutionId, message) => {
  // Get the current time
  const currentTime = new Date();

  // Calculate the timestamp for 6 hours ago
  const createdAt = new Date(currentTime.getTime() - 0 * 60 * 60 * 1000);

  // Get the local time zone offset
  const timezoneOffsetInMinutes = currentTime.getTimezoneOffset();

  // Adjust the time for the local time zone offset
  createdAt.setMinutes(createdAt.getMinutes() - timezoneOffsetInMinutes);

  // Format the createdAt timestamp to 'YYYY-MM-DD HH:MM:SS' format
  const formattedCreatedAt = createdAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const query = `
    INSERT INTO notifications (receiver_id, message, is_read, createdAt)
    VALUES (?, ?, 0, ?)
  `;
  const values = [institutionId, message, formattedCreatedAt];

  try {
    await mysqlcon.promise().query(query, values);
  } catch (error) {
    console.error("Error sending notification:", error);
    throw new Error("Failed to send notification");
  }
};
//reject a job
const Rejectjob = async (req, res) => {
  const { id } = req.params;
  const updateQuery =
    "UPDATE job_descriptions SET status = 'cancelled' WHERE id = ?";
  const getInstituteQuery = `
    SELECT i.email, i.id ,i.name
    FROM job_descriptions j 
    JOIN institutes i ON j.institute_id = i.id
    WHERE j.id = ?
  `;

  try {
    const [updateResults] = await mysqlcon.promise().query(updateQuery, [id]);
    if (updateResults.affectedRows > 0) {
      const [instituteResults] = await mysqlcon
        .promise()
        .query(getInstituteQuery, [id]);
      if (instituteResults.length > 0) {
        const instituteName = instituteResults[0].name;
        const instituteEmail = instituteResults[0].email;
        const instituteId = instituteResults[0].id;
        const message = `Admin was Rejected Your job posting with ID ${id}.`;

        // Send notification to institution
        sendNotificationToInstitution(instituteId, message);
        const replacements = {
          name: instituteName,
        };
        const mailConfig = {
          email: instituteEmail,
          subject: "Reject Your Job",
        };
        await sendEmailService.sendTemplatedEmail(
          mailConfig,
          replacements,
          "REJECT_JOB",
        );

        res.status(200).json({ message: "Job rejected and notification sent" });
      } else {
        res.status(404).json({ message: "Institute not found" });
      }
    } else {
      res.status(404).json({ message: "Job not found" });
    }
  } catch (error) {
    console.error("Error rejecting job:", error);
    res
      .status(500)
      .json({ message: "An error occurred while rejecting the job" });
  }
};

const getAppliedJobs = async (req, res) => {
  const { userId, jobId } = req.params;

  try {
    if (
      !isStaffRole(req.user?.role) &&
      String(userId) !== String(req.user?.id)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }
    // Fetch the job application status
    const application = await job_applications.findOne({
      where: {
        user_id: userId,
        job_id: jobId,
      },
      attributes: ["is_applied"],
    });

    if (application) {
      res.status(200).json({
        is_applied: application.is_applied,
      });
    } else {
      res.status(200).json({
        is_applied: false, // or null, depending on how you want to handle it
        message: "No application found for this user and job",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while retrieving the application status",
      error: error.message,
    });
  }
};

const getWishlistsJobs = async (req, res) => {
  const { userId } = req.params;

  try {
    if (
      !isStaffRole(req.user?.role) &&
      String(userId) !== String(req.user?.id)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }
    // Check if userId is a valid number
    if (isNaN(userId)) {
      return res.status(400).json({
        message: "Invalid userId",
      });
    }

    // Define the SQL query
    const query = `
      SELECT 
        ja.id AS application_id, 
        ja.job_id,
        ja.is_applied,
        j.job_category_id,
        j.name, 
        j.email,
        j.phone,
        j.job_title, 
        j.job_description,
        j.employment_type,
        j.work_schedule,
        j.salary_range,
        j.subjects,
        j.minimum_qualification,
        j.experience,
        j.job_location,
        j.designation,
        j.vacancies,
        j.special_note,
        j.short_description,
        j.createdAt,
        j.updatedAt,
        j.expiry_date,
        j.status,
        j.slug
      FROM 
        job_applications ja
      JOIN 
        job_descriptions j ON ja.job_id = j.id
      WHERE 
        ja.user_id = ?
        AND ja.wishlists = true;
    `;

    // Execute the query using a promise
    const [results] = await mysqlcon.promise().query(query, [userId]);

    // Check if results are empty
    if (results.length === 0) {
      return res.status(200).json({ message: "No Wishlist job found" });
    }

    // Return the results
    return res.status(200).json(results);
  } catch (error) {
    // Log and return any errors
    console.error("Error retrieving wishlist jobs:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving the wishlist jobs",
      error: error.message,
    });
  }
};

const updateJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const gate = await assertCanManageJob(req, id);
    if (!gate.ok) {
      return res.status(gate.status).json({ message: gate.message });
    }
    const resp = await DBMODELS.job_descriptions.update(
      { status: status },
      { where: { id: id } }
    );
    if (resp[0] === 1) {
      return res
        .status(200)
        .json({ status: true, message: "Job status updated successfully!!" });
    }
    return res.status(404).json({ status: false, message: "Job not updated!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const SearchJob = async (req, res) => {
  try {
    // Get search parameters from query string
    const {
      subject, // Subject to search (searches in JSON array)
      location, // Job location to search
      page = 1, // Pagination: current page
      limit = 10, // Pagination: items per page
    } = req.query;

    // Validate at least one search parameter
    if (!subject && !location) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide at least one search parameter (subject or location)",
      });
    }

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    // Search by subject (JSON array search)
    if (subject) {
      // Search for subject in JSON array like ["java","go leng"]
      // This will match partial strings within the JSON
      whereConditions.push("LOWER(jd.subjects) LIKE LOWER(?)");
      queryParams.push(`%"${subject}"%`);
    }

    // Search by job location (text search)
    if (location) {
      whereConditions.push("LOWER(jd.job_location) LIKE LOWER(?)");
      queryParams.push(`%${location}%`);
    }

    // Combine WHERE conditions
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Main query to get jobs
    const query = `
      SELECT 
        jd.*,
        jc.name as category_name
        
      FROM job_descriptions jd
      LEFT JOIN job_categories jc ON jd.job_category_id = jc.id
      ${whereClause}
      ORDER BY jd.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);

    // Count query for total results
    const countQuery = `
      SELECT COUNT(*) as total
      FROM job_descriptions jd
      ${whereClause}
    `;

    const countParams = queryParams.slice(0, -2); // Remove limit and offset for count

    // Execute both queries
    const [jobs] = await mysqlcon.promise().query(query, queryParams);
    const [countResult] = await mysqlcon
      .promise()
      .query(countQuery, countParams);

    const totalJobs = countResult[0].total;
    const totalPages = Math.ceil(totalJobs / parseInt(limit));

    // Parse JSON fields for better readability with error handling
    const formattedJobs = jobs.map((job) => {
      // Helper function to safely parse JSON
      const safeJSONParse = (value, defaultValue) => {
        if (!value) return defaultValue;
        try {
          // If it's already an object/array, return it
          if (typeof value === "object") return value;
          // Try to parse string
          return JSON.parse(value);
        } catch (e) {
          console.error(`JSON parse error for value: ${value}`, e.message);
          return defaultValue;
        }
      };

      return {
        ...job,
        employment_type: safeJSONParse(job.employment_type, []),
        work_schedule: safeJSONParse(job.work_schedule, {}),
        subjects: safeJSONParse(job.subjects, []),
      };
    });

    res.status(200).json({
      success: true,
      message: `Found ${totalJobs} job(s)`,
      data: formattedJobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalJobs: totalJobs,
        jobsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error searching jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error searching jobs",
      error: error.message,
    });
  }
};

const SearchTutorJob = async (req, res) => {
  try {
    // Get search parameters from query string
    const {
      subject, // Subject to search
      city, // City to search
      page = 1, // Pagination: current page
      limit = 10, // Pagination: items per page
    } = req.query;

    // Validate at least one search parameter
    if (!subject && !city) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide at least one search parameter (subject or city)",
      });
    }

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    // Search by subject (text search)
    if (subject) {
      whereConditions.push("LOWER(subject) LIKE LOWER(?)");
      queryParams.push(`%${subject}%`);
    }

    // Search by city (text search)
    if (city) {
      whereConditions.push("LOWER(city) LIKE LOWER(?)");
      queryParams.push(`%${city}%`);
    }

    // Combine WHERE conditions
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Main query to get tutors
    const query = `
      SELECT 
        id,
        connectionStatus,
        name,
        email,
        phone,
        subject,
        city,
        state,
        country,
        isValid,
        createdAt,
        updatedAt
      FROM tutors
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);

    // Count query for total results
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tutors
      ${whereClause}
    `;

    const countParams = queryParams.slice(0, -2); // Remove limit and offset for count

    // Execute both queries
    const [tutors] = await mysqlcon.promise().query(query, queryParams);
    const [countResult] = await mysqlcon
      .promise()
      .query(countQuery, countParams);

    const totalTutors = countResult[0].total;
    const totalPages = Math.ceil(totalTutors / parseInt(limit));

    res.status(200).json({
      success: true,
      message: `Found ${totalTutors} tutor(s)`,
      data: tutors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalTutors: totalTutors,
        tutorsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error searching tutors:", error);
    res.status(500).json({
      success: false,
      message: "Error searching tutors",
      error: error.message,
    });
  }
};

module.exports = {
  getJobs,
  getActiveJobs,
  getTotalJobs,
  getInactiveJobs,
  getJob,
  getJobBySlug,
  addJob,
  updateJob,
  deleteJob,
  getJobCategories,
  getJobCategory,
  addJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getJobDescriptionsByCategory,
  getAllJobApplications,
  getAllJobApplicationsByJobDescriptions,
  getJobApplication,
  createApplication,
  getAllJobApplicationsByInstitute,
  updateApplicationStatus,
  getAllJobApplicationsByApplicantId,
  Approvejob,
  Rejectjob,
  getAppliedJobs,
  addToWishlist,
  removeWishList,
  getWishlistsJobs,
  getallJobs,
  updateJobStatus,
  SearchJob,
  SearchTutorJob,
};
