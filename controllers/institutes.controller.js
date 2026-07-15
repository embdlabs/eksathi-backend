const { DataTypes } = require("sequelize");
const { mysqlcon, sequelize } = require("../model/db");
const { DBMODELS } = require("../models/init-models");
const { createUsernameForUser } = require("../service/auth.service");
const users = require("../models/users")(sequelize, DataTypes);
const { sendNotificationToInstitution } = require("../service/notify");
const institute_contacts = require("../models/institute_contacts")(
  sequelize,
  DataTypes,
);
const { fetchinstituteProfile } = require("../service/utilities.service");
const {
  sendEmailService,
  sendDynamicTemplatedEmail,
  candidateRecievedMail,
  sendWelcomeMail,
} = require("../utils/email");
const { cachedQuery } = require("../utils/db-cache-wrapper");

const getInstitutes = async (req, res) => {
  try {
    let cacheKey = "institute_list";
    let ans = await cachedQuery({
      cacheName: "lists",
      cacheKey: cacheKey,
      sql: `
      SELECT 
        i.id, 
        i.logo, 
        i.username, 
        i.name,
        i.email,
        i.mobile, 
        i.status, 
        p.address, 
        p.city, 
        p.state, 
        p.country,
        p.rating
      FROM 
        institutes i
      LEFT JOIN 
        institute_profiles p ON i.id = p.institute_id
      WHERE i.status = "Active"
      ORDER BY i.id DESC
    `, // Fixed: 'slq' to 'sql'
      params: [], // Added: empty params array
      ttl: 3600, // Optional: Add TTL if needed
    });

    // const query = `
    //   SELECT
    //     i.id,
    //     i.logo,
    //     i.username,
    //     i.name,
    //     i.email,
    //     i.mobile,
    //     i.status,
    //     p.address,
    //     p.city,
    //     p.state,
    //     p.country,
    //     p.rating
    //   FROM
    //     institutes i
    //   LEFT JOIN
    //     institute_profiles p ON i.id = p.institute_id
    //   WHERE i.status = "Active"
    //   ORDER BY i.id DESC
    // `;

    // mysqlcon.query(query, (err, result) => {
    //   if (err) {
    //     console.error('Database query error:', err);
    //     return res.status(500).json({ message: "Internal Server Error" });
    //   }
    //   return res.status(200).json({
    //     message: `${result.length} institutes found`,
    //     result
    //   });
    // });

    let result = ans.data;
    return res.status(200).json({
      message: `${result.length} institutes found`,
      result,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// const getInstitutes = (req, res) => {
//   try {
//     const query = `
//      SELECT id, logo, username, name FROM institutes`;

//     mysqlcon.query(query, (err, result) => {
//       if (err) {
//         console.error('Database query error:', err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }
//       return res.status(200).json({
//         message: `${result.length} institutes found`,
//         result
//       });
//     });
//   } catch (err) {
//     console.error('Unexpected error:', err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// }

const getProfileCompletion = async (req, res) => {
  const userId = req.params.userId; // Assuming you have authentication middleware to extract the user ID
  // console.log("UserId : ",userId)

  if (isNaN(userId)) {
    return res.status(409).json({ message: "Invalid User ID" });
  }

  // Define the fields that contribute to the profile completion
  const profileFields = [
    "username",
    "name",
    "email",
    "mobile",
    "status",
    "createdAt",
    "database_name",
    "auth_verification_path",
    "logo",
    "name",
    "description",
    "head_of_department",
    "eksathi_id",
    "aboutYou",
    "address",
    "city",
    "state",
    "country",
    "postal_code",
    "affiliate_id",
    "establishmentDate",
    "facebook",
    "instagram",
    "youtube",
    "instituteRegistrationNumber",
    "github",
    "linkedin",
    "landmark",
    "pocdesignation",
    "pocemail",
    "pocname",
    "pocphone",
    "twitter",
    "website",
    "affiliate_type",
    // Add more fields as needed
  ];

  // console.log("profile Fields : ",profileFields)
  try {
    // Fetch the user's profile data from the database or any other data source
    const profileData = await fetchinstituteProfile(userId).catch((error) =>
      console.error(error),
    );
    // console.log("profile Fields : ",profileData)

    // Calculate the number of completed fields
    const completedFields = profileFields?.filter(
      (field) =>
        profileData[field] !== undefined &&
        profileData[field] !== "" &&
        profileData[field] !== null,
    );

    // Calculate the profile completion percentage
    const completionPercentage =
      (completedFields.length / profileFields.length) * 100;

    return res.status(200).json({
      completionPercentage: Math.round(completionPercentage * 100) / 100,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getInstitute = async (req, res) => {
  const instituteId = req.params.instituteId;

  try {
    console.log("Fetching institute with ID:", instituteId);

    // Fetch the institute and related data
    const institute = await DBMODELS.institutes.findOne({
      where: { id: instituteId },
      include: [
        {
          model: DBMODELS.institute_profiles,
          as: "institute_profiles",
        },
        {
          model: DBMODELS.institute_departments,
          as: "institute_departments",
          include: [
            {
              model: DBMODELS.institute_teachers,
              as: "institute_teachers",
            },
            {
              model: DBMODELS.institute_students,
              as: "institute_students",
            },
          ],
        },
      ],
    });

    // If no institute found, return 404
    if (!institute) {
      return res.status(404).json({
        message: "Institute Profile not found",
      });
    }

    // Logging missing data for debugging, but not returning errors for missing departments, teachers, or students
    if (!institute.institute_profiles) {
      // console.log("Institute Profile not found for institute ID:", instituteId);
    }

    if (
      !institute.institute_departments ||
      institute.institute_departments.length === 0
    ) {
      console.log("No departments found for institute ID:", instituteId);
    } else {
      institute.institute_departments.forEach((department) => {
        if (
          !department.institute_teachers ||
          department.institute_teachers.length === 0
        ) {
          console.log("No teachers found for department ID:", department.id);
        }

        if (
          !department.institute_students ||
          department.institute_students.length === 0
        ) {
          console.log("No students found for department ID:", department.id);
        }
      });
    }

    // Return success response with the available institute data
    res.status(200).json({
      message: "Institute information retrieved successfully",
      institute,
    });
  } catch (error) {
    // Catch any general error
    console.error("Error fetching institute:", error);
    res.status(500).json({
      message: "Internal Server error",
      error: error.message,
    });
  }
};

const createInstituteProfile = async (req, res) => {
  try {
    const instituteProfile = await DBMODELS.institute_profiles.create(req.body);
    res.status(201).json(instituteProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get Institute Profile by Institute ID
const getInstituteProfile = async (req, res) => {
  const instituteId = req.params.instituteId;
  try {
    const instituteProfile = await DBMODELS.institute_profiles.findOne({
      where: { institute_id: instituteId },
    });
    if (instituteProfile) {
      res.json(instituteProfile);
    } else {
      res.status(404).json({ message: "Institute Profile not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateInstituteProfile = async (req, res) => {
  const instituteId = req.params.instituteId;
  // console.log("instituteId",instituteId)
  // console.log("updatedInstituteProfile=>>>>>> ",req.body)
  try {
    const [rowsUpdated, [updatedInstituteProfile]] =
      await DBMODELS.institute_profiles.update(req.body, {
        where: { institute_id: instituteId },
        returning: true,
      });
    // console.log("rowsUpdated=============>>",rowsUpdated)

    if (rowsUpdated > 0) {
      res.json(updatedInstituteProfile);
    } else {
      res.status(404).json({ message: "Institute Profile not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete Institute Profile
const deleteInstituteProfile = async (req, res) => {
  const instituteId = req.params.instituteId;
  try {
    const deletedCount = await DBMODELS.institute_profiles.destroy({
      where: { institute_id: instituteId },
    });
    if (deletedCount > 0) {
      res.json({ message: "Institute Profile deleted" });
    } else {
      res.status(404).json({ message: "Institute Profile not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Onboard an Institute
// const onboardingInstitute = async (req, res) => {
//   const instituteId = req.params.instituteId;
//   try {
//     const { instituteData, profileData } = req.body;
//     // console.log("Onboarding Data: ", { instituteData, profileData });
//     console.log("instituteData",instituteData)
//     console.log("profileData",profileData)

//     // Update Institute
//     // const updatedInstitute = await DBMODELS.institutes.update(instituteData, {
//     //   where: { id: instituteId }, // Assuming params contains the institute's ID
//     // });
// // console.log("updatedInstitute---------",updatedInstitute)
//     const institute = await DBMODELS.institutes.findOne({
//       where: { id: instituteId },
//     });
//     // console.log("institute++++++++++++++++",institute)

//     const [user, created] = await DBMODELS.users.findOrCreate({
//       where: { email: institute?.email },
//       defaults: {
//         username: institute?.username,
//         email: institute?.email,
//         password: institute?.password,
//         role: "institute",
//         display_name: institute?.name,
//         phone: institute?.mobile,
//         avatar_url: institute?.logo,
//         bio: profileData?.aboutYou,
//         status: "active",
//       },
//     });

//     // Associate Institute Profile
//     const profile = await DBMODELS.institute_profiles.create({
//       ...profileData,
//       institute_id: instituteId,
//       eksathi_id: user?.id,
//     });

//     if(profile){
//       await sendWelcomeMail(instituteData.email,institute.username,instituteData.role,institute.profilelink,instituteData.firstName)
//     }

//     res.status(201).json({ institute, profile });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

const onboardingInstitute = async (req, res) => {
  const instituteId = req.params.instituteId;
  try {
    const { instituteData, profileData } = req.body;
    // console.log("instituteData", instituteData);
    // console.log("profileData", profileData);

    // Update Institute status to Active after onboarding
    const updatedInstitute = await DBMODELS.institutes.update(
      {
        status: instituteData.status || "Active",
      },
      {
        where: { id: instituteId },
      },
    );
    // console.log("updatedInstitute---------", updatedInstitute);

    const institute = await DBMODELS.institutes.findOne({
      where: { id: instituteId },
    });

    const [user, created] = await DBMODELS.users.findOrCreate({
      where: { email: institute?.email },
      defaults: {
        username: institute?.username,
        email: institute?.email,
        password: institute?.password,
        role: "institute",
        display_name: institute?.name,
        phone: institute?.mobile,
        avatar_url: institute?.logo,
        bio: profileData?.aboutYou,
        status: "active",
      },
    });

    // Associate Institute Profile
    const profile = await DBMODELS.institute_profiles.create({
      ...profileData,
      institute_id: instituteId,
      eksathi_id: user?.id,
    });

    if (profile) {
      await sendWelcomeMail(
        instituteData.email,
        institute.username,
        instituteData.role,
        institute.profilelink,
        instituteData.firstName,
      );
    }

    res.status(201).json({ institute, profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const AddContactInstitute = async (req, res) => {
  const { senderId, receiverId } = req.body;
  const { title, description } = req.body.values;

  try {
    const newContact = await institute_contacts.create({
      user_id: senderId,
      institute_id: receiverId,
      title,
      description,
    });

    const user = await users.findOne({ where: { id: senderId } });
    const message = `You have a message from ${
      user.first_name + " " + user.last_name
    } based on ${title}`; // Assuming the username has a 'name' property
    sendNotificationToInstitution(receiverId, senderId, message);

    res.status(201).json(newContact);
  } catch (error) {
    console.error("Error contacting institute:", error);
    res
      .status(500)
      .json({ error: "An error occurred while contacting the institute." });
  }
};

const getContactInstitute = async (req, res) => {
  const { id } = req.params;

  try {
    // SQL query with correct JOIN syntax
    const selectQuery = `
      SELECT u.id AS userId,u.username AS username,u.first_name AS firstname,u.last_name AS lastname, i.name AS instituteName,ic.title,ic.description,ic.createdAt
      FROM institute_contacts ic
      JOIN users u ON ic.user_id = u.id
      JOIN institutes i ON ic.institute_id = i.id
      WHERE ic.institute_id = ?
    `;

    let [rows] = await mysqlcon.promise().query(selectQuery, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(rows);
  } catch (error) {
    console.log("Error getting contact information", error);
    res.status(500).json({
      error: "An error occurred while retrieving the contact information.",
    });
  }
};
//get userdetails by id
const getUserContactDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const selectQuery = `SELECT u.first_name,u.last_name,ic.title,ic.description,ic.user_id,ic.createdAt FROM institute_contacts ic
    JOIN users u ON ic.user_id = u.id
    WHERE user_id = ?`;
    const [rows] = await mysqlcon.promise().query(selectQuery, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No user data found" });
    }
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const ReplyInstituteContact = async (req, res) => {
  const { userId, description, instituteId, institute, reply } = req.body;
  console.log(req.body);
  // Validate required fields
  if (!userId || !description || !reply || !institute || !instituteId) {
    return res.status(400).json({
      error: "userId, description, instituteId, and reply are required.",
    });
  }

  try {
    // Find the institute contact by userId and description
    const [rows] = await mysqlcon
      .promise()
      .query(
        "SELECT * FROM institute_contacts WHERE user_id = ? AND description = ?",
        [userId, description],
      );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found with the provided userId and description.",
      });
    }

    // Update the reply column
    await mysqlcon
      .promise()
      .query(
        "UPDATE institute_contacts SET reply = ? WHERE user_id = ? AND description = ?",
        [reply, userId, description],
      );

    // Construct notification message with bold reply
    const message = `You have a reply from ${institute} and that reply is : "${reply}"`;
    // Send notification to institution
    await sendNotificationToInstitution(userId, instituteId, message);

    res.status(200).json("Replied successfully");
  } catch (error) {
    console.error("Error adding reply:", error);
    res
      .status(500)
      .json({ error: "An error occurred while adding the reply." });
  }
};

const sendMailByInstitute = async (req, res) => {
  try {
    const {
      receiverEmail,
      subject = "Confirmation Email",
      candidateName,
      instituteName,
      candidatePhone,
      candidateEmail,
      jobTitle,
      hrEmail,
      hrPhone,
      website,
      linkedin,
      careers,
    } = req.body;

    // Input validation
    if (!receiverEmail || !subject) {
      return res.status(400).json({
        success: false,
        message: "Receiver email and subject are required",
      });
    }

    // Call with CORRECT parameter order
    let emailSent;
    emailSent = await sendDynamicTemplatedEmail(
      receiverEmail,
      subject,
      candidateName,
      candidateEmail,
      candidatePhone,
      jobTitle,
      instituteName,
      hrEmail,
      hrPhone,
      website,
      linkedin,
      careers,
    );

    emailSent = await candidateRecievedMail(
      hrEmail,
      subject,
      candidateName,
      candidateEmail,
      candidatePhone,
      jobTitle,
      instituteName,
    );

    if (emailSent) {
      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send email",
      });
    }
  } catch (error) {
    console.log("Error in sendMailByInstitute:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

const searchTeachersAndProfessionals = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT DISTINCT
        u.id, u.username, u.email, u.role, u.display_name,
        u.first_name, u.middle_name, u.last_name, u.location,
        u.nearestLocation, u.phone, u.bio, u.avatar_url,
        u.status, u.is_online, u.show_contact_details,
        u.subject, u.teaching_method, u.qualification,
        u.experience, u.rating, u.updatedAt, u.createdAt
      FROM users u
      LEFT JOIN skills s ON u.id = s.user_id
      WHERE u.role IN ('teacher', 'professional')
        AND u.status = 'active'
    `;

    const params = [];

    // Universal search filter - searches across ALL fields
    if (search) {
      query += ` AND (
        LOWER(u.first_name) LIKE LOWER(?) OR
        LOWER(u.last_name) LIKE LOWER(?) OR
        LOWER(u.middle_name) LIKE LOWER(?) OR
        LOWER(u.display_name) LIKE LOWER(?) OR
        LOWER(u.username) LIKE LOWER(?) OR
        LOWER(u.email) LIKE LOWER(?) OR
        LOWER(u.bio) LIKE LOWER(?) OR
        LOWER(u.qualification) LIKE LOWER(?) OR
        LOWER(u.teaching_method) LIKE LOWER(?) OR
        LOWER(u.nearestLocation) LIKE LOWER(?) OR
        (JSON_VALID(u.location) AND LOWER(JSON_EXTRACT(u.location, '$.city')) LIKE LOWER(?)) OR
        (JSON_VALID(u.location) AND LOWER(JSON_EXTRACT(u.location, '$.state')) LIKE LOWER(?)) OR
        (JSON_VALID(u.location) AND LOWER(JSON_EXTRACT(u.location, '$.country')) LIKE LOWER(?)) OR
        (JSON_VALID(u.subject) AND LOWER(u.subject) LIKE LOWER(?)) OR
        (s.skill_name IS NOT NULL AND JSON_VALID(s.skill_name) AND LOWER(s.skill_name) LIKE LOWER(?)) OR
        LOWER(s.certification) LIKE LOWER(?) OR
        LOWER(s.proficiency_level) LIKE LOWER(?)
      )`;
      const searchPattern = `%${search}%`;
      // Push the search pattern 17 times (once for each field)
      for (let i = 0; i < 17; i++) {
        params.push(searchPattern);
      }
    }

    query += ` ORDER BY u.rating DESC, u.experience DESC`;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    // Execute query
    const [results] = await mysqlcon.promise().query(query, params);

    // Count query
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN skills s ON u.id = s.user_id
      WHERE u.role IN ('teacher', 'professional')
        AND u.status = 'active'
    `;
    const countParams = [];

    // Apply same search filter to count query
    if (search) {
      countQuery += ` AND (
        LOWER(u.first_name) LIKE LOWER(?) OR
        LOWER(u.last_name) LIKE LOWER(?) OR
        LOWER(u.middle_name) LIKE LOWER(?) OR
        LOWER(u.display_name) LIKE LOWER(?) OR
        LOWER(u.username) LIKE LOWER(?) OR
        LOWER(u.email) LIKE LOWER(?) OR
        LOWER(u.bio) LIKE LOWER(?) OR
        LOWER(u.qualification) LIKE LOWER(?) OR
        LOWER(u.teaching_method) LIKE LOWER(?) OR
        LOWER(u.nearestLocation) LIKE LOWER(?) OR
        (JSON_VALID(u.location) AND LOWER(JSON_EXTRACT(u.location, '$.city')) LIKE LOWER(?)) OR
        (JSON_VALID(u.location) AND LOWER(JSON_EXTRACT(u.location, '$.state')) LIKE LOWER(?)) OR
        (JSON_VALID(u.location) AND LOWER(JSON_EXTRACT(u.location, '$.country')) LIKE LOWER(?)) OR
        (JSON_VALID(u.subject) AND LOWER(u.subject) LIKE LOWER(?)) OR
        (s.skill_name IS NOT NULL AND JSON_VALID(s.skill_name) AND LOWER(s.skill_name) LIKE LOWER(?)) OR
        LOWER(s.certification) LIKE LOWER(?) OR
        LOWER(s.proficiency_level) LIKE LOWER(?)
      )`;
      const searchPattern = `%${search}%`;
      for (let i = 0; i < 17; i++) {
        countParams.push(searchPattern);
      }
    }

    const [countResult] = await mysqlcon
      .promise()
      .query(countQuery, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error searching teachers and professionals:", error);
    res.status(500).json({
      success: false,
      message: "Error searching users",
      error: error.message,
    });
  }
};


const getInstituteWithPagination = async(req,res)=>{
  try {
   let { page = 1, limit = 10 } = req.query

    page = Number(page)
    limit = Number(limit)
    const offset = (page - 1) * limit


    const query = `SELECT i.*,ip.* FROM institutes i LEFT JOIN institute_profiles ip on i.id = ip.institute_id ORDER BY i.createdAt LIMIT ?  OFFSET ?`

    mysqlcon.query(query, [ limit, offset], (err, rows) => {
      if (err) return res.status(500).json(err)

      res.json({
        page,
        count: rows.length,
        data: rows
      })
    })

  } catch (error) {
    res.status(500).json(err)
  }
}

module.exports = {
  getInstituteWithPagination,
  searchTeachersAndProfessionals,
  sendMailByInstitute,
  getInstitutes,
  getInstitute,
  createInstituteProfile,
  getInstituteProfile,
  updateInstituteProfile,
  deleteInstituteProfile,
  onboardingInstitute,
  AddContactInstitute,
  getContactInstitute,
  ReplyInstituteContact,
  getUserContactDetails,
  getProfileCompletion,
};
