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

// GET all job descriptions by institute ID
const getJobs = async (req, res) => {
  const instituteId = req.query.instituteId;
  try {
    const query = `SELECT jd.*, i.name as institute_name , i.logo as institute_logo FROM job_descriptions  jd
      LEFT JOIN institutes  i ON jd.institute_id = i.id

     ${instituteId ? `WHERE institute_id=${instituteId}` : ""}`;
    //  const query = `SELECT
    //       jd.*,
    //       i.name as institute_name
    //     FROM job_descriptions jd
    //     LEFT JOIN institutes i ON jd.institute_id = i.id
    //     ${instituteId ? `WHERE jd.institute_id=${instituteId}` : ""}`;

    mysqlcon.query(query, async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      const jobsWithApplications = await Promise.all(
        results.map(async (job) => {
          // job.employment_type = JSON.parse(job.employment_type);
          // job.work_schedule = JSON.parse(job.work_schedule);
          // job.subjects = JSON.parse(job.subjects);
          // job.minimum_qualification = JSON.parse(job.minimum_qualification);

          const totalApplications = await DBMODELS.job_applications.count({
            where: {
              job_id: job.id,
            },
          });

          return { ...job, totalApplications };
        }),
      );

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
        // for (var i in results) {
        //   results[i].employment_type = JSON.parse(results[i].employment_type);
        //   results[i].work_schedule = JSON.parse(results[i].work_schedule);
        //   results[i].subjects = JSON.parse(results[i].subjects);
        //   results[i].minimum_qualification = JSON.parse(results[i].minimum_qualification);
        //   let totalApplications = await DBMODELS.job_applications.count({
        //     where: {
        //       job_id: results[i].id
        //     }
        //   });
        //   results[i] = { ...results[i], totalApplications }
        // }
        // const totalApplications = results.reduce((acc, cur) => {
        //   return acc + cur.totalApplications;
        // }, 0);
        // console.log(results)
        return res.status(200).json({ message: "Jobs Found", results });
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
    if (response.length > 0) {
      return res.status(200).json({ message: "Jobs Found", results: response });
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

    let results = result.data;
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
    role,
  } = req.body;
  const start_date = req.body.start_date;
  const expiry_date = req.body.end_date;
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;

  console.log("req.body is ", req.body);

  // Check if the user has the role of "institute", "admin", or "superadmin"
  if (!["institute", "admin", "superadmin"].includes(role)) {
    return res.status(403).json({
      message:
        'Only users with the role of "institute", "admin", "superadmin" can post a new job',
    });
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

    mysqlcon.query(instituteQuery, [institute_id], (err, instituteResults) => {
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
        institute_id,
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
const updateJob = (req, res) => {
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
  const userRole = req.user.role;
  const start_date = req.body.start_date;
  const end_date = req.body.end_date;
  // Check if the user has the role of "institute"
  // Replace this with your authentication logic
  // if (userRole !== 'institute') {
  //   return res.status(403).json({ message: 'Only users with the role of "institute" can post a new job' });
  // }

  try {
    const query =
      "UPDATE job_descriptions SET name = ?, email = ?, phone = ?, institute_id = ?, job_title = ?, job_description = ?, employment_type = ?, work_schedule = ?, salary_range = ?, subjects = ?, minimum_qualification = ?, experience = ?, job_location = ?, designation = ?, vacancies = ?, special_note = ? ,createdAt = ?,expiry_date=? WHERE id = ?";
    const values = [
      name,
      email,
      phone,
      institute_id,
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

    mysqlcon.query(query, values, (err, results) => {
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
const deleteJob = (req, res) => {
  const jobId = req.params.id;
  const userRole = req.user.role;
  // Check if the user has the role of "institute"
  // Replace this with your authentication logic
  // if (userRole !== 'institute') {
  //   return res.status(403).json({ message: 'Only users with the role of "institute" can post a new job' });
  // };

  try {
    mysqlcon.query(
      "DELETE FROM job_descriptions WHERE id = ?",
      [jobId],
      (err, results) => {
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
    //
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

    return res.status(200).json(jobApplication);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const createApplication = async (req, res) => {
  try {
    // Validate the request body
    const { user_id, job_id, cover_letter } = req.body;
    if (!user_id || !job_id || !cover_letter) {
      return res.status(400).json({
        message: "Missing required fields: user_id, job_id, cover_letter",
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

    // Respond with the created application
    return res.status(201).json(newJobApplication);
  } catch (error) {
    console.error("Error creating job application:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const addToWishlist = async (req, res) => {
  try {
    // Validate the request body
    const { user_id, job_id } = req.body;
    if (!user_id || !job_id) {
      return res.status(400).json({
        message: "Missing required fields: user_id, job_id",
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
    // Validate the request body
    const { userId, jobId } = req.params;
    console.log("user Id :", userId);
    console.log("job Id :", jobId);
    const user_id = userId;
    const job_id = jobId;
    if (!user_id || !job_id) {
      return res.status(400).json({
        message: "Missing required fields: user_id, job_id",
      });
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

  console.log("Job ID:", id);
  console.log("New Status:", status);
  const resp = await DBMODELS.job_descriptions.update(
    { status: status },
    {
      where: {
        id: id,
      },
    },
  );
  console.log("Response:", resp);
  if (resp[0] === 1) {
    return res
      .status(200)
      .json({ status: true, message: "Job status updated successfully!!" });
  } else {
    return res.status(404).json({ status: false, message: "Job not updated!" });
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
