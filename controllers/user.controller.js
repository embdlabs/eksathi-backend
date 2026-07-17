const { default: axios } = require("axios");
const { DataTypes, literal, col } = require("sequelize");
const sequelize = require("../model/connection");
const { mysqlcon, mysqlpromise } = require("../model/db");
const research = require("../models/research");
const { DBMODELS } = require("../models/init-models");
const Teachers = require("../models/teachers")(sequelize, DataTypes);
const InstituteProfile = require("../models/institute_profiles")(
  sequelize,
  DataTypes,
);
const {
  generateOTP,
  createUsernameForUser,
  createPasswordForUser,
} = require("../service/auth.service");
const {
  updateUserActivity,
  findExpertise,
  getUserStats,
  getTotalVotes,
  getLastActive,
  getAvailableLocations,
  getAvailableExpertise,
  findUserRating,
  getConnectionStatus,
  getPresentWorkExperience,
  fetchUserProfile,
  getTotalUsers,
  processUsers,
} = require("../service/utilities.service");
const sendEmailService = require("../utils/email");
const { hashingPassword } = require("../utils/validation");
const { Op } = require("sequelize");
const ratings = require("../models/ratings")(sequelize, DataTypes);
const institutes = require("../models/institutes")(sequelize, DataTypes);

const NodeCache = require("node-cache");
const { cachedQuery } = require("../utils/db-cache-wrapper");
const { setToCache, getFromCache } = require("../utils/catch-manage");
const cache = new NodeCache({ stdTTL: 600 });

// const updateActivity = async (req, res) => {
//   const { userId, isActive } = req.body;
//   try {
//     await updateUserActivity(userId, isActive);
//     res.send('User activity status updated');
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// };
// const updateUser = async (req, res) => {
//   const email = req.params.email;
//   const userData = req.body;
//   const imageLink = req?.file?.Location || req.body.avatar_url; // Handle image link from file or body
//   const columnsToUpdate = [];

//   // Check if user email is available to update
//   if (!email) {
//     return res.status(403).json({ message: "User Identifier not available" });
//   }

//   // Check which columns to update based on available data
//   if (userData.dname) {
//     columnsToUpdate.push({ column: "display_name", value: userData.dname });
//   }
//   if (userData.location) {
//     columnsToUpdate.push({ column: "location", value: userData.location });
//   }
//   if (userData.bio) {
//     columnsToUpdate.push({ column: "bio", value: userData.bio });
//   }
//   if (userData.contact) {
//     columnsToUpdate.push({ column: "phone", value: userData.contact });
//   }
//   if (imageLink) {
//     columnsToUpdate.push({ column: "avatar_url", value: imageLink });
//   }

//   if (columnsToUpdate.length === 0) {
//     // No columns to update
//     return res
//       .status(400)
//       .json({ success: false, message: "No data provided for update" });
//   }

//   try {
//     // Prepare the query and values
//     const query = `UPDATE users SET ${columnsToUpdate
//       .map((col) => `${col.column} = ?`)
//       .join(", ")} WHERE email = ?`;
//     const values = columnsToUpdate.map((col) => col.value);

//     // Execute the query
//     mysqlcon.query(query, [...values, email], (err, results) => {
//       if (err) {
//         console.error("Error updating user:", err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }
//       if (results.affectedRows === 1) {
//         return res.json({
//           success: true,
//           message: "User details updated successfully",
//         });
//       } else {
//         return res
//           .status(404)
//           .json({ success: false, message: "User not found" });
//       }
//     });
//   } catch (error) {
//     console.error("Server error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

const updateUser = async (req, res) => {
  const email = req.params.email;
  const userData = req.body;

  // Modified: Get image URL from local file instead of AWS S3
  const imageLink = req?.file?.url || req.body.avatar_url; // Use file.url from local storage
  const columnsToUpdate = [];

  // Check if user email is available to update
  if (!email) {
    return res.status(403).json({ message: "User Identifier not available" });
  }

  // Check which columns to update based on available data
  if (userData.dname) {
    columnsToUpdate.push({ column: "display_name", value: userData.dname });
  }
  if (userData.location) {
    columnsToUpdate.push({ column: "location", value: userData.location });
  }
  if (userData.bio) {
    columnsToUpdate.push({ column: "bio", value: userData.bio });
  }
  if (userData.contact) {
    columnsToUpdate.push({ column: "phone", value: userData.contact });
  }
  if (imageLink) {
    columnsToUpdate.push({ column: "avatar_url", value: imageLink });
  }

  if (columnsToUpdate.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No data provided for update" });
  }

  try {
    // First, get the old avatar URL to delete the file if it exists
    const getOldAvatarQuery = "SELECT avatar_url FROM users WHERE email = ?";

    mysqlcon.query(getOldAvatarQuery, [email], (err, oldResults) => {
      if (err) {
        console.error("Error fetching old user data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      // Prepare the update query
      const query = `UPDATE users SET ${columnsToUpdate
        .map((col) => `${col.column} = ?`)
        .join(", ")} WHERE email = ?`;
      const values = columnsToUpdate.map((col) => col.value);

      // Execute the update query
      mysqlcon.query(query, [...values, email], (err, results) => {
        if (err) {
          console.error("Error updating user:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (results.affectedRows === 1) {
          // If a new image was uploaded, delete the old one
          if (imageLink && oldResults.length > 0 && oldResults[0].avatar_url) {
            const fs = require("fs");
            const path = require("path");
            const oldImagePath = path.join(__dirname, oldResults[0].avatar_url);

            // Delete old file if it exists (and it's not the same as new one)
            if (
              fs.existsSync(oldImagePath) &&
              oldResults[0].avatar_url !== imageLink
            ) {
              fs.unlinkSync(oldImagePath);
              console.log("Old avatar deleted:", oldImagePath);
            }
          }

          return res.json({
            success: true,
            message: "User details updated successfully",
            data: {
              avatar_url: imageLink || null,
              updated_fields: columnsToUpdate.map((col) => col.column),
            },
          });
        } else {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
      });
    });
  } catch (error) {
    console.error("Server error:", error);

    // Clean up uploaded file if there's an error
    if (req.file && req.file.path) {
      const fs = require("fs");
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateUserProfile = async (req, res) => {
  const id = req.params.id;
  const userData = req.body;

  if (!id) {
    return res.status(403).json({ message: "User Identifier not available" });
  }

  // -------- Collect profile updates (user_profiles table) --------
  const profileUpdates = {};
  if (userData.fname) profileUpdates.first_name = userData.fname;
  if (userData.mname) profileUpdates.middle_name = userData.mname;
  if (userData.lname) profileUpdates.last_name = userData.lname;
  if (userData.dob) profileUpdates.dob = userData.dob;
  if (userData.gender) profileUpdates.gender = userData.gender;
  if (userData.profession) profileUpdates.profession = userData.profession;
  if (userData.designation) profileUpdates.designation = userData.designation;
  if (userData.institute) profileUpdates.institute = userData.institute;
  if (userData.education) profileUpdates.education = userData.education;
  if (userData.rating) profileUpdates.rating = userData.rating;
  if (userData.school) profileUpdates.school = userData.school;
  if (userData.board) profileUpdates.board = userData.board;
  if (userData.classname) profileUpdates.classLevel = userData.classname;
  if (userData.classLevel) profileUpdates.classLevel = userData.classLevel;
  if (userData.subject) {
    profileUpdates.selectedSubjects = Array.isArray(userData.subject)
      ? userData.subject
      : userData.subject;
  }
  if (userData.selectedSubjects) profileUpdates.selectedSubjects = userData.selectedSubjects;
  if (userData.location) profileUpdates.location = userData.location;
  if (userData.bio) profileUpdates.bio = userData.bio;

  // -------- Collect users updates --------
  const userUpdates = {};
  if (userData.qualification)
    userUpdates.qualification = userData.qualification;
  if (userData.experience) userUpdates.experience = userData.experience;
  if (userData.rating) userUpdates.rating = userData.rating;
  if (userData.bio) userUpdates.bio = userData.bio;
  if (userData.dname) userUpdates.display_name = userData.dname;
  if (userData.displayName) userUpdates.display_name = userData.displayName;
  if (userData.location) userUpdates.location = userData.location;
  if (userData.teaching_method) userUpdates.teaching_method = userData.teaching_method;
  if (userData.subject) userUpdates.subject = userData.subject;
  if (userData.nearestLocation) userUpdates.nearestLocation = userData.nearestLocation;

  // Auto bio generation
  if (
    userData.fname &&
    userData.lname &&
    userData.education &&
    userData.institute
  ) {
    userUpdates.bio = `Hello! My name is ${userData.fname} ${userData.lname}, and I am excited to share a little bit about myself. I am currently in ${userData.education} at ${userData.institute}. I believe that education is a journey of self-discovery and growth, and I am eager to make the most of my time as a student.`;
  }

  try {
    // -------- Update user_profiles --------
    if (Object.keys(profileUpdates).length > 0) {
      const query = "UPDATE user_profiles SET ? WHERE user_id = ?";
      mysqlcon.query(query, [profileUpdates, id], (err, results) => {
        if (err) {
          console.error("❌ Profile update error:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (results.affectedRows === 0) {
          const insertQuery = "INSERT INTO user_profiles SET ?";
          const insertData = { user_id: id, ...profileUpdates };
          mysqlcon.query(insertQuery, insertData, (err) => {
            if (err) {
              console.error("❌ Profile insert error:", err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
          });
        }
      });
    }

    // -------- Update users --------
    if (Object.keys(userUpdates).length > 0) {
      const userUpdateQuery = "UPDATE users SET ? WHERE id = ?";
      mysqlcon.query(userUpdateQuery, [userUpdates, id], (err, userRes) => {
        if (err) {
          console.error("❌ Users update error:", err);
        } else {
          console.log("✅ Users updated:", userRes);
        }
      });
    }

    // -------- Update Teachers --------
    if (userData.role === "teacher") {
      const teacherData = {
        name: `${userData.fname || ""} ${userData.lname || ""}`.trim(),
      };

      // Sync qualification, experience, rating (same as users table)
      if (userData.qualification)
        teacherData.qualification = userData.qualification;
      if (userData.experience) teacherData.experience = userData.experience;
      if (userData.rating) teacherData.rating = userData.rating;

      if (userData.subject) teacherData.subject = userData.subject;
      if (userData.classname) teacherData.class = userData.classname;
      if (userData.email) teacherData.contact_info = userData.email;

      if (userData.address?.city) teacherData.city = userData.address.city;
      if (userData.address?.state) teacherData.state = userData.address.state;

      const teacherUpdateQuery = "UPDATE Teachers SET ? WHERE contact_info = ?";
      mysqlcon.query(
        teacherUpdateQuery,
        [teacherData, userData.email],
        (err, teacherResults) => {
          if (err) {
            console.error("❌ Teacher update error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
          }

          if (teacherResults.affectedRows === 0) {
            const teacherInsertQuery = "INSERT INTO Teachers SET ?";
            mysqlcon.query(
              teacherInsertQuery,
              teacherData,
              (err, insertRes) => {
                if (err) {
                  console.error("❌ Teacher insert error:", err);
                  return res
                    .status(500)
                    .json({ message: "Internal Server Error" });
                }
                console.log("✅ Teacher inserted:", insertRes);
              },
            );
          } else {
            console.log("✅ Teacher updated:", teacherResults);
          }
        },
      );
    }

    return res
      .status(200)
      .json({ success: true, message: "User details updated successfully" });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateUserSocialLinks = async (req, res) => {
  const id = req.params.id;
  const userData = req.body;
  const columnsToUpdate = [];
  const values = [];

  // check if user email or id available to update
  if (!id)
    return res.status(403).json({ message: "User Identifier not available" });

  // Update all social link columns, including empty strings
  // This allows users to clear/blank out fields

  columnsToUpdate.push(`website_url=?`);
  values.push(userData.website || null);

  columnsToUpdate.push(`twitter_link=?`);
  values.push(userData.twitter || null);

  columnsToUpdate.push(`facebook_link=?`);
  values.push(userData.facebook || null);

  columnsToUpdate.push(`instagram_link=?`);
  values.push(userData.instagram || null);

  columnsToUpdate.push(`youtube_link=?`);
  values.push(userData.youtube || null);

  columnsToUpdate.push(`vimeo_link=?`);
  values.push(userData.vimeo || null);

  columnsToUpdate.push(`github_link=?`);
  values.push(userData.github || null);

  columnsToUpdate.push(`linkedin_link=?`);
  values.push(userData.linkedin || null);

  console.log("columnsToUpdate: ", columnsToUpdate);
  console.log("values: ", values);

  try {
    // Update the user data with parameterized query
    const query = `UPDATE user_profiles SET ${columnsToUpdate.join(
      ", ",
    )} WHERE user_id=?`;

    // Add user_id to the end of values array
    values.push(id);

    mysqlcon.query(query, values, (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      if (results.affectedRows >= 0) {
        res.json({
          success: true,
          message: "User social links updated successfully",
          results,
        });
      } else {
        res.status(404).json({ success: false, message: "User not found" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//get userProfile
// const getUserProfile = async (req, res) => {
//   const userId = req.params.id;
//   if (!userId) {
//     return res.status(404).json({ message: "User ID is required" });
//   }

//   try {
//     // Promisify the query function
//     const query = (sql, params) => {
//       return new Promise((resolve, reject) => {
//         mysqlcon.query(sql, params, (err, results) => {
//           if (err) {
//             return reject(err);
//           }
//           resolve(results);
//         });
//       });
//     };

//     // Retrieve the user's basic information
//     const userResult = await query("SELECT * FROM users WHERE id = ?", [
//       userId,
//     ]);
//     const user = userResult[0];
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Retrieve the user's address information
//     const addressResult = await query(
//       "SELECT * FROM address WHERE user_id = ?",
//       [userId]
//     );
//     const address = addressResult[0];

//     // Retrieve the user's social profile information
//     // const socialResult = await query(
//     //   "SELECT * FROM social_profiles WHERE user_id = ?",
//     //   [userId]
//     // );
//     // const socialProfiles = socialResult;

//     // Retrieve the user's professional details
//     const workResult = await query(
//       "SELECT * FROM work_experience WHERE user_id = ?",
//       [userId]
//     );
//     const workExperience = workResult;

//     // Retrieve the user's educational details
//     const educationResult = await query(
//       "SELECT * FROM educations WHERE user_id = ?",
//       [userId]
//     );
//     const education = educationResult;

//     // Retrieve the user's certifications
//     const certResult = await query(
//       "SELECT * FROM certifications WHERE user_id = ?",
//       [userId]
//     );
//     const skillsResult = await query("SELECT * FROM skills WHERE user_id = ?", [
//       userId,
//     ]);
//     const certifications = certResult;
//     const skills = skillsResult;

//     // Combine all the user's information into a single object
//     const userProfile = {
//       user,
//       address,
//       //   socialProfiles,
//       workExperience,
//       education,
//       certifications,
//       skills,
//     };

//     res.status(200).json(userProfile);
//   } catch (error) {
//     console.error("Error retrieving user profile:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const getUserProfile = async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const cacheKey = `userProfile_${userId}`;
  const cachedProfile = cache.get(cacheKey);

  if (cachedProfile) {
    return res.status(200).json(cachedProfile);
  }

  try {
    // Use mysqlpromise.query() - this returns a Promise
    const [userResult, workResult, educationResult, certResult, skillsResult] =
      await Promise.all([
        mysqlpromise.query(
          `
        SELECT 
          id, username, email, password, role, display_name, 
          first_name, middle_name, last_name, location, nearestLocation, 
          phone, bio, avatar_url, status, is_online, 
          updatedAt, createdAt, show_contact_details, subject, 
          teaching_method, qualification, experience, rating, 
          login_count, is_verified
        FROM users 
        WHERE id = ?
      `,
          [userId],
        ),

        mysqlpromise.query(
          `
        SELECT 
          id, user_id, title, description, organization, ctc,
          subject, standard, location, employment_type, is_working,
          start_date, end_date, createdAt, updatedAt
        FROM work_experience 
        WHERE user_id = ?
      `,
          [userId],
        ),

        mysqlpromise.query(
          `
        SELECT 
          id, user_id, institution_name as institution, degree, 
          field_of_study, start_date, end_date, description, grade,
          createdAt, updatedAt
        FROM educations 
        WHERE user_id = ?
      `,
          [userId],
        ),

        mysqlpromise.query("SELECT * FROM certifications WHERE user_id = ?", [
          userId,
        ]),
        mysqlpromise.query("SELECT * FROM skills WHERE user_id = ?", [userId]),
      ]);

    // mysqlpromise.query() returns [rows, fields]
    const [userRows] = userResult; // userRows contains the actual data
    const [workRows] = workResult;
    const [educationRows] = educationResult;
    const [certRows] = certResult;
    const [skillRows] = skillsResult;

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userProfile = {
      user: {
        ...userRows[0],
        show_contact_details: Boolean(userRows[0].show_contact_details),
        is_verified: Boolean(userRows[0].is_verified),
        is_online: Boolean(userRows[0].is_online),
      },
      workExperience: workRows.map((work) => ({
        ...work,
        is_working: Boolean(work.is_working),
      })),
      education: educationRows.map((edu) => ({
        ...edu,
        start_date: edu.start_date
          ? new Date(edu.start_date).toISOString()
          : null,
        end_date: edu.end_date ? new Date(edu.end_date).toISOString() : null,
        createdAt: edu.createdAt ? new Date(edu.createdAt).toISOString() : null,
        updatedAt: edu.updatedAt ? new Date(edu.updatedAt).toISOString() : null,
      })),
      certifications: certRows.map((cert) => ({
        ...cert,
        createdAt: cert.createdAt
          ? new Date(cert.createdAt).toISOString()
          : null,
        updatedAt: cert.updatedAt
          ? new Date(cert.updatedAt).toISOString()
          : null,
      })),
      skills: skillRows.map((skill) => ({
        ...skill,
        createdAt: skill.createdAt
          ? new Date(skill.createdAt).toISOString()
          : null,
        updatedAt: skill.updatedAt
          ? new Date(skill.updatedAt).toISOString()
          : null,
      })),
    };

    cache.set(cacheKey, userProfile);
    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getUser = async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "User Id is required!" });
  }

  try {
    const cacheKey = `user_${userId}`; // Unique cache key per user

    const result = await cachedQuery({
      cacheKey: cacheKey,
      cacheName: "users", // Using 'users' cache instead of 'lists'
      sql: `
        SELECT
          u.id,
          u.username,
          u.email,
          u.status,
          u.createdAt,
          u.display_name,
          u.first_name,
          u.middle_name,
          u.last_name,
          u.location,
          u.phone,
          u.avatar_url,
          u.bio,
          u.role,
          u.is_online,
          u.show_contact_details,
          u.qualification,
          u.experience,
          up.gender,
          up.dob,
          up.profile_pic,
          up.profession,
          up.designation,
          up.institute,
          up.education,
          up.website_url,
          up.twitter_link,
          up.facebook_link,
          up.linkedin_link,
          up.github_link,
          up.instagram_link,
          up.youtube_link,
          up.vimeo_link,
          a.address_line_1,
          a.address_line_2,
          a.city,
          a.state,
          a.country,
          a.zip_code,
          GROUP_CONCAT(DISTINCT s.skill_name ORDER BY s.skill_name ASC SEPARATOR ', ') AS skills,
          GROUP_CONCAT(DISTINCT e.institution_name ORDER BY e.start_date DESC SEPARATOR ', ') AS educations,
          GROUP_CONCAT(DISTINCT c.certification_name ORDER BY c.issue_date DESC SEPARATOR ', ') AS certifications,
          GROUP_CONCAT(DISTINCT w.organization ORDER BY w.start_date DESC SEPARATOR ', ') AS work_experience,
          GROUP_CONCAT(DISTINCT r.research_name ORDER BY r.start_date DESC SEPARATOR ', ') AS research
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN address a ON u.id = a.user_id
        LEFT JOIN skills s ON u.id = s.user_id
        LEFT JOIN educations e ON u.id = e.user_id
        LEFT JOIN certifications c ON u.id = c.user_id
        LEFT JOIN work_experience w ON u.id = w.user_id
        LEFT JOIN research r ON u.id = r.user_id
        WHERE u.id = ?
        GROUP BY u.id, up.id, a.id
      `,
      ttl: 300, // 5 minutes cache for user data
      params: [userId],
    });

    const rows = result.data;

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
        cacheInfo: {
          fromCache: result.fromCache,
          timestamp: result.timestamp,
        },
      });
    }

    // Get additional data in parallel
    const [presentWork, stats, lastActive, rating] = await Promise.all([
      getPresentWorkExperience(userId),
      getUserStats(userId).catch((err) => {
        console.error("Error getting user stats:", err);
        return null;
      }),
      getLastActive(userId),
      findUserRating(userId),
    ]);

    // Process the data
    const userData = rows[0];

    // Helper function to split comma-separated strings into arrays
    const splitString = (str) =>
      str ? str.split(", ").filter((item) => item.trim() !== "") : [];

    const user = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      status: userData.status,
      name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim(),
      first_name: userData.first_name,
      last_name: userData.last_name,
      avatar_url: userData.avatar_url,
      role: userData.role,
      show_contact_details: userData.show_contact_details,
      location: userData.location,
      qualification: userData.qualification,
      experience: userData.experience,
      profile: {
        profile_pic: userData.profile_pic,
        display_name: userData.display_name,
        first_name: userData.first_name,
        middle_name: userData.middle_name,
        last_name: userData.last_name,
        location: userData.location,
        phone: userData.phone,
        bio: userData.bio,
        role: userData.role,
        gender: userData.gender,
        dob: userData.dob,
        profession: userData.profession,
        designation: userData.designation,
        institute: userData.institute,
        education: userData.education,
        address: {
          address_line_1: userData.address_line_1,
          address_line_2: userData.address_line_2,
          city: userData.city,
          state: userData.state,
          country: userData.country,
          zip_code: userData.zip_code,
        },
        social_links: {
          website: userData.website_url,
          twitter: userData.twitter_link,
          facebook: userData.facebook_link,
          instagram: userData.instagram_link,
          youtube: userData.youtube_link,
          vimeo: userData.vimeo_link,
          github: userData.github_link,
          linkedin: userData.linkedin_link,
        },
      },
      skills: splitString(userData.skills),
      educations: splitString(userData.educations),
      certifications: splitString(userData.certifications),
      work_experience: splitString(userData.work_experience),
      research: splitString(userData.research),
      presentWork: presentWork,
      stats: stats,
      createdAt: userData.createdAt,
      is_online: userData.is_online,
      last_active: lastActive,
      rating: rating || 0,
      cacheInfo: {
        fromCache: result.fromCache,
        timestamp: result.timestamp,
        userId: userId,
      },
    };

    res.status(200).json(user);
  } catch (err) {
    console.error("Error in getUser:", err);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const getUserByUsername = async (req, res) => {
  const username = req.params.username;
  const currentUser = req.query.userId;
  if (!username) {
    return res.status(403).json({ message: "Username is required!" });
  }

  try {
    const query = `
          SELECT
            u.id,
            u.username,
            u.email,
            u.status,
            u.createdAt,
            u.display_name,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.location,
            u.phone,
            u.avatar_url,
            u.bio,
            u.role,
            u.is_online,
            u.show_contact_details,
            u.rating,
            
            up.gender,
            up.dob,
            up.profile_pic,
            up.profession,
            up.designation,
            up.institute,
            up.education,
            up.website_url,
            up.twitter_link,
            up.facebook_link,
            up.linkedin_link,
            up.github_link,
            up.instagram_link,
            up.youtube_link,
            up.vimeo_link,
            up.rating as profile_rating,
            a.address_line_1,
            a.address_line_2,
            a.city,
            a.state,
            a.country,
            a.zip_code,
            a.country,
            GROUP_CONCAT(DISTINCT s.skill_name ORDER BY s.skill_name ASC SEPARATOR ', ') AS skills,
            GROUP_CONCAT(DISTINCT e.institution_name ORDER BY e.start_date DESC SEPARATOR ', ') AS educations,
            GROUP_CONCAT(DISTINCT c.certification_name ORDER BY c.issue_date DESC SEPARATOR ', ') AS certifications,
            GROUP_CONCAT(DISTINCT w.organization, w.organization ORDER BY w.start_date DESC SEPARATOR ', ') AS work_experience,
            GROUP_CONCAT(DISTINCT r.research_name ORDER BY r.start_date DESC SEPARATOR ', ') AS research
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
          LEFT JOIN address a ON u.id = a.user_id
          LEFT JOIN skills s ON u.id = s.user_id
          LEFT JOIN educations e ON u.id = e.user_id
          LEFT JOIN certifications c ON u.id = c.user_id
          LEFT JOIN work_experience w ON u.id = w.user_id
          LEFT JOIN research r ON u.id = r.user_id
          WHERE u.username = ?
          GROUP BY u.id, up.id, a.id;
        `;
    mysqlcon.query(query, [username], async (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Internal Server Error" });
      }
      if (rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use profile_rating from user_profiles if available, otherwise fallback to calculated rating
      let ratingValue = rows[0].profile_rating;
      if (ratingValue === undefined || ratingValue === null) {
        ratingValue = await findUserRating(rows[0].id);
      }

      const user = {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        status: rows[0].status,
        name: rows[0].first_name + " " + rows[0].last_name,
        first_name: rows[0].first_name,
        last_name: rows[0].last_name,
        avatar_url: rows[0].avatar_url,
        role: rows[0].role,
        show_contact_details: rows[0].show_contact_details,
        profile: {
          profile_pic: rows[0].profile_pic,
          display_name: rows[0].display_name,
          first_name: rows[0].first_name,
          middle_name: rows[0].middle_name,
          last_name: rows[0].last_name,
          location: rows[0].location,
          phone: rows[0].phone,
          bio: rows[0].bio,
          role: rows[0].role,
          gender: rows[0].gender,
          dob: rows[0].dob,
          profession: rows[0].profession,
          designation: rows[0].designation,
          institute: rows[0].institute,
          education: rows[0].education,
          address: {
            address_line_1: rows[0].address_line_1,
            address_line_2: rows[0].address_line_2,
            city: rows[0].city,
            state: rows[0].state,
            country: rows[0].country,
            zip_code: rows[0].zip_code,
          },
          social_links: {
            website: rows[0].website_url,
            twitter: rows[0].twitter_link,
            facebook: rows[0].facebook_link,
            instagram: rows[0].instagram_link,
            youtube: rows[0].youtube_link,
            vimeo: rows[0].vimeo_link,
            github: rows[0].github_link,
            linkedin: rows[0].linkedin_link,
          },
        },
        skills: rows[0].skills,
        educations: rows[0].educations,
        certifications: rows[0].certifications,
        work_experience: rows[0].work_experience,
        research: rows[0].research,
        presentWork: await getPresentWorkExperience(rows[0].id),
        stats: await getUserStats(rows[0].id).catch((err) => console.log(err)),
        connectionStatus:
          currentUser &&
          currentUser !== rows[0].id &&
          currentUser !== "undefined"
            ? await getConnectionStatus(currentUser, rows[0].id).catch((err) =>
                console.log(err),
              )
            : null,
        createdAt: rows[0].createdAt,
        is_online: rows[0].is_online,
        last_active: await getLastActive(rows[0].id),
        rating: parseFloat(ratingValue) || 0,
      };
      user.skills = user.skills ? user.skills.split(", ") : [];
      user.educations = user.educations ? user.educations.split(", ") : [];
      user.certifications = user.certifications
        ? user.certifications.split(", ")
        : [];
      user.work_experience = user.work_experience
        ? user.work_experience.split(", ")
        : [];
      user.research = user.research ? user.research.split(", ") : [];

      res.status(200).json(user);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// This function creates a new user using the data from the HTTP request body
const createUser = async (req, res) => {
  // Extract the required fields from the request body
  const {
    partner,
    email,
    first_name,
    last_name,
    phone,
    role,
    avatar_url,
    bio,
    institute_name,
    institute_id,
    education,
    subject,
  } = req.body;

  // Check if the required fields are present in the request body
  if (!first_name || !email || !phone || !last_name) {
    // Return an error message if any required field is missing
    return res.status(400).json({ message: "Name, Email is missing" });
  }

  /*
   * Input validation using Joi schema validation (commented out)
   */
  // const validation = await InstituteRegisterSchema.validate(req.body);
  //validation error
  // if (validation.error)
  //     return res.status(403).json({
  //         message: validation.error.message,
  //     });
  //validation is ok

  let bioTemplate = `Hello! My name is ${first_name} ${last_name}, and I am excited to share a little bit about myself. I am currently in [Grade/Year] at [School Name]. I believe that education is a journey of self-discovery and growth, and I am eager to make the most of my time as a ${role}.`;

  try {
    // Check if a user with the same email or phone number already exists in the database
    mysqlcon.query(
      `SELECT email FROM users WHERE email='${email}' OR phone=${phone}`,
      async (err, result) => {
        if (err) {
          // Return an error message if there is an error while querying the database
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        console.log("Result: ", result);
        if (result.length) {
          // Return an error message if a user with the same email or phone number already exists in the database
          return res.status(409).json({ message: "Already Registered" });
        } else {
          // Generate a unique username and password for the new user
          const username = createUsernameForUser();
          const password = createPasswordForUser();

          // Hash the password for security
          let hashpassword = await hashingPassword(password);

          // Insert the new user into the database
          mysqlcon.query(
            'INSERT INTO users (username, password, email, first_name, last_name, phone, role, bio, avatar_url, status,subject) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "inactive")',
            [
              username,
              hashpassword,
              email,
              first_name,
              last_name,
              phone,
              role,
              bio || bioTemplate,
              avatar_url,
              subject,
            ],
            async (error, results, fields) => {
              if (error) {
                // Return an error message if there is an error while inserting the new user into the database
                console.error(error);
                res.status(500).json({ message: "Error signing up user" });
              } else {
                console.log("User signed up successfully!");
                console.log("Temporary Password: ", password);
                const userId = results.insertId;
                // let clientotp = generateOTP();
                // console.log("otp", clientotp);
                // otp = await hashingPassword(clientotp);
                // // Set the expiry time for the OTP (in minutes)
                // const expiry = 10; // The OTP will expire in 10 minutes
                // mysqlcon.query(
                //     `INSERT INTO otp (user_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`, [userid, clientotp, expiry],
                //     function (err, result) {
                //         if (err) {
                //             console.log(err);
                //             res.status(500).json({ message: "Internal Server Error" });
                //         } else {
                //             console.log(result);
                //             // sendEmailService(
                //             //     validation.value.identifier,
                //             //     "DO NOT SHARE: One time Password Verify Account",
                //             //     `Confirm Your Account to eksathi using OTP ${clientotp}`
                //             // );
                //             res.status(403).json({
                //                 message: "Verify your account",
                //                 desc: "Check your email address for the otp",
                //                 userId: userid,
                //             });
                //         }
                //     }
                // );

                mysqlcon.query(
                  `INSERT INTO user_profiles (first_name, last_name, profession, education, bio, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    first_name,
                    last_name,
                    role,
                    education,
                    bio || bioTemplate,
                    userId,
                  ],
                  async (err) => {
                    if (err) {
                      console.log(err);
                      return res.status(500).json({ message: err.message });
                    }
                    console.log("User signed up successfully!");

                    // Send Welcome to user's email
                    const replacements = {
                      name: first_name + " " + last_name,
                      partner: partner || "Yuvamanthan",
                    };
                    let mailConfig = {
                      email: email,
                      subject: `Welcome to EkSathi!`,
                      password: password,
                    };
                    sendEmailService.sendTemplatedEmail(
                      mailConfig,
                      replacements,
                      "SERVICE_REGISTRATION",
                    );

                    res.status(200).json({
                      message: "User signed up successfully!",
                      results,
                      fields,
                    });
                  },
                );

                // Return a success message with the new user's information
              }
            },
          );
        }
      },
    );
  } catch (error) {
    // Return an error message if there is an error while creating the new user
    console.log(err);
    res.status(409).json({ message: "Something went worng" });
  }
};

// const getUsers = async (req, res) => {
//     const { page = 1, limit = 50 } = req.query;
//     const startIndex = (page - 1) * limit;

//     try {
//         mysqlcon.query(
//             `SELECT u.id,
//             u.first_name,
//             u.last_name,
//             u.avatar_url,
//             u.location,
//             up.education,
//             up.profession
//             FROM users as u
//             LEFT JOIN user_profiles up ON u.id = up.user_id
//              LIMIT ${startIndex}, ${limit}`,
//             async (err, users) => {
//                 if (err) {
//                     console.log(err);
//                     return res.status(500).json({ message: 'Internal Server Error' });
//                 }
//                 for (var i = 0; i < users.length; i++) {
//                     let expertise = await findExpertise(users[i].id);
//                     expertise = expertise[0]?.skill_name ? expertise[0]?.skill_name.split(', ') : [];
//                     users[i] = { ...users[i], expertise };
//                 }
//                 res.status(200).json({
//                     message: "Users Found",
//                     users
//                 });
//             }
//         );

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

// All users Data Students Teacher And Professionals

// const getUsers = async (req, res) => {
//   const {
//     page = 1,
//     limit = 12,
//     location,
//     skill,
//     rating,
//     student = "false",
//     teacher = "true",
//     professional = "true",
//     subject,
//     sortBy,
//     search,
//     userId = null,
//   } = req.query;
//   const startIndex = (page - 1) * limit;
//   console.log(req.query);
//   try {
//     let query = `
//         SELECT u.id,
//         u.first_name,
//         u.last_name,
//         u.avatar_url,
//         u.username,
//         u.role,
//         u.show_contact_details,
//         u.is_online,
//         u.subject,
//         u.location,
//         up.education,
//         up.profession,
//         up.classLevel,
//         up.rating as profile_rating,
//         l.city_name,
//         l.pincode,
//         l.district,
//         l.state_name,
//         l.area,
//         COALESCE(GROUP_CONCAT(s.skill_name ORDER BY s.skill_name SEPARATOR ', '), '') AS skills
//         FROM users AS u
//         LEFT JOIN user_profiles AS up ON u.id = up.user_id
//         LEFT JOIN skills AS s ON u.id = s.user_id
//         LEFT JOIN locations AS l ON u.id = l.user_id
//         WHERE 1=1
//       `;

//     const params = [];

//     // Default Role Filtering
//     if (teacher === "true" || professional === "true" || student === "true") {
//       const roles = [];
//       if (teacher === "true") roles.push("teacher");
//       if (professional === "true") roles.push("professional");
//       if (student === "true") roles.push("student");

//       query += ` AND u.role IN (${roles.map(() => "?").join(", ")})`;
//       params.push(...roles);
//     } else {
//       query += ` AND u.role IN ('teacher', 'professional','student')`;
//     }

//     // Add filters
//     if (
//       location &&
//       location !== "" &&
//       location !== "undefined" &&
//       location !== "null"
//     ) {
//       query += `AND l.city_name = ?`;
//       params.push(location);
//     }

//     if (skill && skill !== "" && skill !== "undefined" && skill !== "null") {
//       query += ` AND JSON_UNQUOTE(s.skill_name) LIKE ? AND s.proficiency_level = 'Expert'`;
//       params.push(`%${skill}%`);
//     }

//     if (
//       rating &&
//       rating !== "" &&
//       rating !== "undefined" &&
//       rating !== "null"
//     ) {
//       query += ` AND up.rating = ?`;
//       params.push(rating);
//     }

//     if (
//       subject &&
//       subject !== "" &&
//       subject !== "undefined" &&
//       subject !== "null"
//     ) {
//       const subjects = subject.split(",").map((s) => s.trim());

//       const subjectConditions = subjects
//         .map(
//           () =>
//             "((JSON_VALID(u.subject) AND JSON_CONTAINS(u.subject, ?)) OR u.subject LIKE ?)"
//         )
//         .join(" OR ");

//       query += ` AND (${subjectConditions})`;

//       subjects.forEach((s) => {
//         params.push(`"${s}"`);
//         params.push(`%${s}%`);
//       });
//     }

//     if (
//       search &&
//       search !== "" &&
//       search !== "undefined" &&
//       search !== "null"
//     ) {
//       query += ` AND (u.first_name LIKE ?  OR s.skill_name LIKE ? OR u.location LIKE ? OR up.location LIKE ?)`;
//       params.push(

//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`
//       );
//     }

//     // Add sorting
//     let orderBy = `u.id`;
//     if (sortBy === `recent`) {
//       orderBy = `u.id DESC`;
//     } else if (sortBy === `name`) {
//       orderBy = `u.first_name, u.last_name`;
//     } else if (sortBy === `rating`) {
//       orderBy = `up.rating DESC`;
//     } else if (sortBy === `student`) {
//       orderBy = `CASE u.role WHEN 'student' THEN 1 WHEN 'teacher' THEN 2 WHEN 'professional' THEN 3 ELSE 4 END`;
//     } else if (sortBy === `teacher`) {
//       orderBy = `CASE u.role WHEN 'teacher' THEN 1 WHEN 'professional' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//     } else if (sortBy === `profession`) {
//       orderBy = `CASE u.role WHEN 'professional' THEN 1 WHEN 'teacher' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//     }

//     query += `
//   GROUP BY u.id, u.first_name, u.last_name, u.avatar_url, u.location, u.username, u.role, up.education, up.profession
//   ORDER BY ${orderBy}
//   LIMIT ${startIndex}, ${limit}
// `;

//     mysqlcon.query(query, params, async (err, users) => {
//       if (err) {
//         console.log(err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }

//       // roleCounts (still keeping in case you need it)
//       const roleCounts = {
//         student: 0,
//         teacher: 0,
//         professional: 0,
//       };

//       // Get total users (all roles together)
//       const totalUsersQuery = `
//         SELECT COUNT(*) AS totalUsers
//         FROM users
//         WHERE role IN ('teacher', 'professional','student')
//       `;

//       mysqlcon.query(totalUsersQuery, async (err, totalRes) => {
//         if (err) {
//           console.log(err);
//           return res.status(500).json({ message: "Internal Server Error" });
//         }

//         const totalUsers = totalRes[0].totalUsers;

//         if (
//           student === "true" ||
//           teacher === "true" ||
//           professional === "true"
//         ) {
//           const roleQuery = `
//               SELECT role, COUNT(*) as count
//               FROM users
//               WHERE role IN (?)
//               GROUP BY role
//               `;

//           const roleParams = [];
//           if (student === "true") roleParams.push("student");
//           if (teacher === "true") roleParams.push("teacher");
//           if (professional === "true") roleParams.push("professional");

//           mysqlcon.query(roleQuery, [roleParams], async (err, counts) => {
//             if (err) {
//               console.log(err);
//               return res.status(500).json({ message: "Internal Server Error" });
//             }

//             counts.forEach((row) => {
//               if (row.role === "student") roleCounts.student = row.count;
//               if (row.role === "teacher") roleCounts.teacher = row.count;
//               if (row.role === "professional")
//                 roleCounts.professional = row.count;
//             });

//             for (let i = 0; i < users.length; i++) {
//               let ratingValue = users[i].profile_rating;
//               if (ratingValue === undefined || ratingValue === null) {
//                 ratingValue = await findUserRating(users[i].id);
//               }
//               users[i].rating =
//                 ratingValue !== undefined && ratingValue !== null
//                   ? parseFloat(ratingValue)
//                   : 0;

//               const lastActive = await getLastActive(users[i].id);
//               users[i].last_active = lastActive;
//               users[i].profession = users[i]?.role;

//               if (userId && userId !== "undefined") {
//                 const connectionStatus = await getConnectionStatus(
//                   userId,
//                   users[i].id
//                 ).catch((err) => console.log(err));
//                 users[i].connectionStatus = connectionStatus;
//               }
//             }

//             // let locations = await getAvailableLocations();
//             let expertises = await getAvailableExpertise();

//             res.status(200).json({
//               message: "Users Found",
//               users,
//               // locations,
//               expertises,
//               roleCounts,
//               totalUsers, // ✅ now added
//             });
//           });
//         } else {
//           let locations = await getAvailableLocations();
//           let expertises = await getAvailableExpertise();

//           res.status(200).json({
//             message: "Users Found",
//             users,
//             locations,
//             expertises,
//             roleCounts,
//             totalUsers, // ✅ now added
//           });
//         }
//       });
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const getUsers = async (req, res) => {
//   const {
//     page = 1,
//     limit = 12,
//     location,
//     skill,
//     rating,
//     student = "false",
//     teacher = "true",
//     professional = "true",
//     subject,
//     sortBy,
//     search,
//     userId = null,
//   } = req.query;
//   const startIndex = (page - 1) * limit;
//   try {
//     let query = `
//         SELECT u.id,
//         u.first_name,
//         u.last_name,
//         u.avatar_url,
//         u.username,
//         u.role,
//         u.show_contact_details,
//         u.is_online,
//         u.subject,
//         u.location,
//         up.education,
//         up.profession,
//         up.classLevel,
//         up.rating as profile_rating,
//         l.city_name,
//         l.pincode,
//         l.district,
//         l.state_name,
//         l.area,
//         COALESCE(GROUP_CONCAT(s.skill_name ORDER BY s.skill_name SEPARATOR ', '), '') AS skills
//         FROM users AS u
//         LEFT JOIN user_profiles AS up ON u.id = up.user_id
//         LEFT JOIN skills AS s ON u.id = s.user_id
//         LEFT JOIN locations AS l ON u.id = l.user_id
//         WHERE 1=1
//       `;

//     const params = [];

//     // Default Role Filtering
//     if (teacher === "true" || professional === "true" || student === "true") {
//       const roles = [];
//       if (teacher === "true") roles.push("teacher");
//       if (professional === "true") roles.push("professional");
//       if (student === "true") roles.push("student");

//       query += ` AND u.role IN (${roles.map(() => "?").join(", ")})`;
//       params.push(...roles);
//     } else {
//       query += ` AND u.role IN ('teacher', 'professional','student')`;
//     }

//     // Add filters
//     if (
//       location &&
//       location !== "" &&
//       location !== "undefined" &&
//       location !== "null"
//     ) {
//       query += ` AND l.city_name = ?`;
//       params.push(location);
//     }

//     if (skill && skill !== "" && skill !== "undefined" && skill !== "null") {
//       query += ` AND JSON_UNQUOTE(s.skill_name) LIKE ? AND s.proficiency_level = 'Expert'`;
//       params.push(`%${skill}%`);
//     }

//     if (
//       rating &&
//       rating !== "" &&
//       rating !== "undefined" &&
//       rating !== "null"
//     ) {
//       query += ` AND up.rating = ?`;
//       params.push(rating);
//     }

//     if (
//       subject &&
//       subject !== "" &&
//       subject !== "undefined" &&
//       subject !== "null"
//     ) {
//       const subjects = subject.split(",").map((s) => s.trim());

//       const subjectConditions = subjects
//         .map(
//           () =>
//             "((JSON_VALID(u.subject) AND JSON_CONTAINS(u.subject, ?)) OR u.subject LIKE ?)"
//         )
//         .join(" OR ");

//       query += ` AND (${subjectConditions})`;

//       subjects.forEach((s) => {
//         params.push(`"${s}"`);
//         params.push(`%${s}%`);
//       });
//     }

//     // ✅ FIXED: Search now includes skills properly
//     if (
//       search &&
//       search !== "" &&
//       search !== "undefined" &&
//       search !== "null"
//     ) {
//       query += ` AND (
//         u.first_name LIKE ?
//         u.is_online LIKE ?
//         OR u.last_name LIKE ?
//         OR JSON_UNQUOTE(s.skill_name) LIKE ?
//         OR u.location LIKE ?
//         OR up.location LIKE ?
//         OR l.city_name LIKE ?
//         OR l.state_name LIKE ?
//         OR l.area LIKE ?
//       )`;
//       params.push(
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`
//       );
//     }

//     // Add sorting
//     let orderBy = `u.id`;
//     if (sortBy === `recent`) {
//       orderBy = `u.id DESC`;
//     } else if (sortBy === `name`) {
//       orderBy = `u.first_name, u.last_name`;
//     } else if (sortBy === `rating`) {
//       orderBy = `up.rating DESC`;
//     } else if (sortBy === `student`) {
//       orderBy = `CASE u.role WHEN 'student' THEN 1 WHEN 'teacher' THEN 2 WHEN 'professional' THEN 3 ELSE 4 END`;
//     } else if (sortBy === `teacher`) {
//       orderBy = `CASE u.role WHEN 'teacher' THEN 1 WHEN 'professional' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//     } else if (sortBy === `profession`) {
//       orderBy = `CASE u.role WHEN 'professional' THEN 1 WHEN 'teacher' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//     }

//     query += `
//   GROUP BY u.id, u.first_name, u.last_name, u.avatar_url, u.location, u.username, u.role, up.education, up.profession
//   ORDER BY ${orderBy}
//   LIMIT ${startIndex}, ${limit}
// `;

//     mysqlcon.query(query, params, async (err, users) => {
//       if (err) {
//         console.log(err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }

//       // roleCounts (still keeping in case you need it)
//       const roleCounts = {
//         student: 0,
//         teacher: 0,
//         professional: 0,
//       };

//       // Get total users (all roles together)
//       const totalUsersQuery = `
//         SELECT COUNT(*) AS totalUsers
//         FROM users
//         WHERE role IN ('teacher', 'professional','student')
//       `;

//       mysqlcon.query(totalUsersQuery, async (err, totalRes) => {
//         if (err) {
//           console.log(err);
//           return res.status(500).json({ message: "Internal Server Error" });
//         }

//         const totalUsers = totalRes[0].totalUsers;

//         if (
//           student === "true" ||
//           teacher === "true" ||
//           professional === "true"
//         ) {
//           const roleQuery = `
//               SELECT role, COUNT(*) as count
//               FROM users
//               WHERE role IN (?)
//               GROUP BY role
//               `;

//           const roleParams = [];
//           if (student === "true") roleParams.push("student");
//           if (teacher === "true") roleParams.push("teacher");
//           if (professional === "true") roleParams.push("professional");

//           mysqlcon.query(roleQuery, [roleParams], async (err, counts) => {
//             if (err) {
//               console.log(err);
//               return res.status(500).json({ message: "Internal Server Error" });
//             }

//             counts.forEach((row) => {
//               if (row.role === "student") roleCounts.student = row.count;
//               if (row.role === "teacher") roleCounts.teacher = row.count;
//               if (row.role === "professional")
//                 roleCounts.professional = row.count;
//             });

//             for (let i = 0; i < users.length; i++) {
//               let ratingValue = users[i].profile_rating;
//               if (ratingValue === undefined || ratingValue === null) {
//                 ratingValue = await findUserRating(users[i].id);
//               }
//               users[i].rating =
//                 ratingValue !== undefined && ratingValue !== null
//                   ? parseFloat(ratingValue)
//                   : 0;

//               const lastActive = await getLastActive(users[i].id);
//               users[i].last_active = lastActive;
//               users[i].profession = users[i]?.role;

//               if (userId && userId !== "undefined") {
//                 const connectionStatus = await getConnectionStatus(
//                   userId,
//                   users[i].id
//                 ).catch((err) => console.log(err));
//                 users[i].connectionStatus = connectionStatus;
//               }
//             }

//             // let locations = await getAvailableLocations();
//             let expertises = await getAvailableExpertise();

//             res.status(200).json({
//               message: "Users Found",
//               users,
//               // locations,
//               expertises,
//               roleCounts,
//               totalUsers,
//             });
//           });
//         } else {
//           let locations = await getAvailableLocations();
//           let expertises = await getAvailableExpertise();

//           res.status(200).json({
//             message: "Users Found",
//             users,
//             locations,
//             expertises,
//             roleCounts,
//             totalUsers,
//           });
//         }
//       });
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// Only (Two) Teachers and Professionals Data
// const getUsers = async (req, res) => {
//   const { page = 1, limit = 100, location, skill, rating, student, teacher, professional, sortBy, search, userId = null } = req.query;
//   const startIndex = (page - 1) * limit;
//   console.log(req.query);
//   try {
//       let query = `
//       SELECT u.id,
//       u.first_name,
//       u.last_name,
//       u.avatar_url,
//       u.location,
//       u.username,
//       u.role,
//       up.education,
//       up.profession,
//       (SELECT COUNT(*) FROM users) AS total_users
//       FROM users AS u
//       LEFT JOIN user_profiles AS up ON u.id = up.user_id
//       LEFT JOIN skills AS s ON u.id = s.user_id
//       WHERE up.profession IN ('teacher', 'professional')
//     `;
//       const params = [];

//       if (student == 'true') {
//         query += ` OR up.profession = 'student'`;
//       }

//       // Add filters
//       if (location && location !== '' && location !== 'undefined' && location !== 'null') {
//           query += ` AND u.location = ?`;
//           params.push(location);
//       }

//       if (skill && skill !== '' && skill !== 'undefined' && skill !== 'null') {
//           query += ` AND s.skill_name = ? AND s.proficiency_level = 'Expert'`;
//           params.push(skill);
//       }

//       if (rating && rating !== '' && rating !== 'undefined' && rating !== 'null') {
//           query += ` AND up.rating = ?`;
//           params.push(rating);
//       }

//       //   if (profession && profession !== '' && profession !== undefined && profession !==  null) {
//       //     query += ` AND up.profession = ?`;
//       //     params.push(profession);
//       //   }

//       // if(profession){
//       //     query += ` AND up.profession = ${profession}`;
//       // }
//       if (teacher == 'true') {
//           query += ` AND up.profession = ?`;
//           params.push('teacher');
//       }

//       if (student == 'true') {
//           if (teacher == 'true') {
//               query += ` OR`;
//           } else {
//               query += ` AND`;
//           }
//           query += ` up.profession = ?`;
//           params.push('student');
//       }

//       if (professional == 'true') {
//           if (teacher == 'true' || student == 'true') {
//               query += ` OR`;
//           } else {
//               query += ` AND`;
//           }
//           query += ` up.profession = ?`;
//           params.push('professional');
//       }

//       // Add search
//       if (search && search !== '' && search !== 'undefined' && search !== 'null') {
//           query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR s.skill_name LIKE ? OR u.location LIKE ? OR up.location LIKE ?)`;
//           params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
//       }

//       // Add sorting
//       let orderBy = `u.id`;
//       if (sortBy === `recent`) {
//           orderBy = `u.id DESC`;
//       } else if (sortBy === `name`) {
//           orderBy = `u.first_name, u.last_name`;
//       } else if (sortBy === `rating`) {
//           orderBy = `u.rating DESC`;
//       } else if (sortBy === `student`) {
//           orderBy = `CASE up.profession WHEN 'student' THEN 1 WHEN 'teacher' THEN 2 WHEN 'professional' THEN 3 ELSE 4 END`;
//       } else if (sortBy === `teacher`) {
//           orderBy = `CASE up.profession WHEN 'teacher' THEN 1 WHEN 'professional' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//       } else if (sortBy === `profession`) {
//           orderBy = `CASE up.profession WHEN 'professional' THEN 1 WHEN 'teacher' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//       }

//       query += `
//       ORDER BY ${orderBy}
//       LIMIT ${startIndex}, ${limit}
//     `;

//       // console.log("User Query: ", query, params);
//       mysqlcon.query(query, params, async (err, users) => {
//           if (err) {
//               console.log(err);
//               return res.status(500).json({ message: 'Internal Server Error' });
//           }

//           for (let i = 0; i < users.length; i++) {
//               const expertise = await findExpertise(users[i].id);
//               users[i].expertise = expertise[0]?.skill_name ? expertise[0].skill_name.split(', ') : [];
//               let rating = await findUserRating(users[i].id);
//               users[i].rating = parseFloat(rating);
//               const lastActive = await getLastActive(users[i].id);
//               users[i].last_active = lastActive;
//               users[i].profession = users[i]?.profession || users[i]?.role;
//               if (userId && userId !== "undefined") {
//                   const connectionStatus = await getConnectionStatus(userId, users[i].id).catch(err => console.log(err));
//                   users[i].connectionStatus = connectionStatus;
//               }
//               delete users[i]?.role;
//           }

//           let locations = await getAvailableLocations();
//           let expertises = await getAvailableExpertise();

//           res.status(200).json({
//               message: 'Users Found',
//               users,
//               locations,
//               expertises
//           });
//       });
//   } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Internal server error' });
//   }
// };

// const getUsers = async (req, res) => {
//   var {
//     page = 1,
//     limit = 50,
//     location,
//     skill,
//     rating,
//     student,
//     teacher,
//     professional,
//     sortBy,
//     profession,
//     search,
//     userId = null,
//   } = req.query;
//   const startIndex = (page - 1) * limit;
//   if (profession?.includes("[")) {
//     profession = JSON.parse(profession);
//   } else profession = [];
//   let userRoleArray = profession || [];

//   const verifyValue = (val) => {
//     switch (val) {
//       case null:
//       case false:
//       case undefined:
//       case NaN:
//       case "null":
//       case "false":
//       case "undefined":
//       case "NaN":
//         return false;
//       default:
//         return val;
//     }
//   };
//   try {
//     const userRoleCondition = userRoleArray
//       .map((role) => `up.profession = '${role}'`)
//       .join(" OR ");
//     let query = `
//           SELECT DISTINCT u.id,
//           u.first_name,
//           u.last_name,
//           u.avatar_url,
//           u.location,
//           u.username,
//           u.role,
//           up.education,
//           up.profession,
//           (SELECT COUNT(*) FROM user_profiles) AS total_users
//           FROM users AS u
//           INNER JOIN user_profiles AS up ON u.id = up.user_id
//           LEFT JOIN skills AS s ON u.id = s.user_id
//           WHERE 1 = 1
//           ${verifyValue(userRoleCondition) ? ` AND (${userRoleCondition})` : ""}
//           ${verifyValue(rating) ? ` AND up.rating = '${rating}'` : ""}
//           ${verifyValue(location) ? ` AND u.location LIKE '%${location}%'` : ""}
//           ${
//             verifyValue(skill)
//               ? ` AND s.skill_name = '${skill}' AND s.proficiency_level = 'Expert'`
//               : ""
//           }
//         `;

//     let countQuery = `
//           SELECT COUNT(DISTINCT u.id) AS total
//           FROM users AS u
//           INNER JOIN user_profiles AS up ON u.id = up.user_id
//           LEFT JOIN skills AS s ON u.id = s.user_id
//           WHERE 1 = 1
//           ${verifyValue(userRoleCondition) ? ` AND (${userRoleCondition})` : ""}
//           ${verifyValue(rating) ? ` AND up.rating = '${rating}'` : ""}
//           ${verifyValue(location) ? ` AND u.location LIKE '%${location}%'` : ""}
//           ${
//             verifyValue(skill)
//               ? ` AND s.skill_name = '${skill}' AND s.proficiency_level = 'Expert'`
//               : ""
//           }
//         `;
//     const params = [];

//     // Add filters
//     // if (location && location !== '' && location !== 'undefined' && location !== 'null') {
//     //     query += ` AND u.location = ?`;
//     //     params.push(location);
//     // }

//     // if (skill && skill !== '' && skill !== 'undefined' && skill !== 'null') {
//     //     query += ` AND s.skill_name = ? AND s.proficiency_level = 'Expert'`;
//     //     params.push(skill);
//     // }

//     // if (rating && rating !== '' && rating !== 'undefined' && rating !== 'null') {
//     //     query += ` AND up.rating = ?`;
//     //     params.push(rating);
//     // }

//     //   if (profession && profession !== '' && profession !== undefined && profession !==  null) {
//     //     query += ` AND up.profession = ?`;
//     //     params.push(profession);
//     //   }

//     // if (profession) {
//     //     query += ` AND up.profession = ${profession}`;
//     // }
//     // if (teacher == 'true') {
//     //     query += ` AND up.profession = ?`;
//     //     params.push('teacher');
//     // }

//     // if (student == 'true') {
//     //     if (teacher == 'true') {
//     //         query += ` OR`;
//     //     } else {
//     //         query += ` AND`;
//     //     }
//     //     query += ` up.profession = ?`;
//     //     params.push('student');
//     // }

//     // if (professional == 'true') {
//     //     if (teacher == 'true' || student == 'true') {
//     //         query += ` OR`;
//     //     } else {
//     //         query += ` AND`;
//     //     }
//     //     query += ` up.profession = ?`;
//     //     params.push('professional');
//     // }

//     // Add search
//     if (
//       search &&
//       search !== "" &&
//       search !== "undefined" &&
//       search !== "null"
//     ) {
//       query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR s.skill_name LIKE ? OR u.location LIKE ? OR up.location LIKE ?)`;
//       countQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR s.skill_name LIKE ? OR u.location LIKE ? OR up.location LIKE ?)`;
//       params.push(
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`
//       );
//     }
//     // Add sorting
//     let orderBy = `u.id`;
//     if (sortBy === `recent`) {
//       orderBy = `u.id DESC`;
//     } else if (sortBy === `name`) {
//       orderBy = `u.first_name, u.last_name`;
//     } else if (sortBy === `rating`) {
//       orderBy = `u.rating DESC`;
//     } else if (sortBy === `student`) {
//       orderBy = `CASE up.profession WHEN 'student' THEN 1 WHEN 'teacher' THEN 2 WHEN 'professional' THEN 3 ELSE 4 END`;
//     } else if (sortBy === `teacher`) {
//       orderBy = `CASE up.profession WHEN 'teacher' THEN 1 WHEN 'professional' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//     } else if (sortBy === `profession`) {
//       orderBy = `CASE up.profession WHEN 'professional' THEN 1 WHEN 'teacher' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
//     }
//     query += `
//         ORDER BY ${orderBy}
//         LIMIT ${startIndex}, ${limit}
//       `;
//         // console.log("User Query: ", query, params);
//         mysqlcon.query(query, params, async (err, users) => {
//             if (err) {
//                 console.log(err);
//                 return res.status(500).json({ message: 'Internal Server Error' });
//             }

//       let totalUsers = await getTotalUsers(countQuery, params);

//       for (let i = 0; i < users.length; i++) {
//         const expertise = await findExpertise(users[i].id);
//         users[i].expertise = expertise[0]?.skill_name
//           ? expertise[0].skill_name.split(", ")
//           : [];
//         let rating = await findUserRating(users[i].id);
//         users[i].rating = parseFloat(rating);
//         const lastActive = await getLastActive(users[i].id);
//         users[i].last_active = lastActive;
//         users[i].profession = users[i]?.profession || users[i]?.role;
//         if (userId && userId !== "undefined") {
//           const connectionStatus = await getConnectionStatus(
//             userId,
//             users[i].id
//           ).catch((err) => console.log(err));
//           users[i].connectionStatus = connectionStatus;
//         }
//         delete users[i]?.role;
//       }

//       let locations = await getAvailableLocations();
//       let expertises = await getAvailableExpertise();

//       res.status(200).json({
//         message: "Users Found",
//         users,
//         locations,
//         expertises,
//         totalUsers,
//       });
//     });
//   } catch (error) {
//     res.status(400).send("internal server error");
//   }
// };

const getUsers = async (req, res) => {
  const {
    page = 1,
    limit = 12,
    location,
    skill,
    rating,
    student = "false",
    teacher = "true",
    professional = "true",
    subject,
    sortBy,
    search,
    userId = null,
  } = req.query;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
  const startIndex = (pageNum - 1) * pageLimit;

  const hasValue = (val) =>
    val !== undefined &&
    val !== null &&
    val !== "" &&
    val !== "undefined" &&
    val !== "null";

  try {
    // Avoid GROUP BY + GROUP_CONCAT(ORDER BY JSON): skills.skill_name is JSON and
    // that pattern 500s on MySQL (production /app/user). Use scalar subqueries instead.
    let query = `
      SELECT u.id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.username,
        u.role,
        u.show_contact_details,
        u.is_online,
        u.subject,
        u.location,
        up.education,
        up.profession,
        up.classLevel,
        up.rating AS profile_rating,
        (
          SELECT l.city_name FROM locations l
          WHERE l.user_id = u.id LIMIT 1
        ) AS city_name,
        (
          SELECT l.pincode FROM locations l
          WHERE l.user_id = u.id LIMIT 1
        ) AS pincode,
        (
          SELECT l.district FROM locations l
          WHERE l.user_id = u.id LIMIT 1
        ) AS district,
        (
          SELECT l.state_name FROM locations l
          WHERE l.user_id = u.id LIMIT 1
        ) AS state_name,
        (
          SELECT l.area FROM locations l
          WHERE l.user_id = u.id LIMIT 1
        ) AS area,
        COALESCE((
          SELECT GROUP_CONCAT(DISTINCT CAST(s.skill_name AS CHAR) SEPARATOR ', ')
          FROM skills s
          WHERE s.user_id = u.id
        ), '') AS skills
      FROM users AS u
      LEFT JOIN user_profiles AS up ON u.id = up.user_id
      WHERE 1=1
    `;

    const params = [];

    if (teacher === "true" || professional === "true" || student === "true") {
      const roles = [];
      if (teacher === "true") roles.push("teacher");
      if (professional === "true") roles.push("professional");
      if (student === "true") roles.push("student");
      query += ` AND u.role IN (${roles.map(() => "?").join(", ")})`;
      params.push(...roles);
    } else {
      query += ` AND u.role IN ('teacher', 'professional', 'student')`;
    }

    if (hasValue(location)) {
      query += ` AND EXISTS (
        SELECT 1 FROM locations l
        WHERE l.user_id = u.id AND l.city_name = ?
      )`;
      params.push(location);
    }

    if (hasValue(skill)) {
      query += ` AND EXISTS (
        SELECT 1 FROM skills s
        WHERE s.user_id = u.id
          AND CAST(s.skill_name AS CHAR) LIKE ?
          AND s.proficiency_level = 'Expert'
      )`;
      params.push(`%${skill}%`);
    }

    if (hasValue(rating)) {
      query += ` AND up.rating = ?`;
      params.push(rating);
    }

    if (hasValue(subject)) {
      const subjects = String(subject)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (subjects.length) {
        const subjectConditions = subjects
          .map(
            () =>
              "((JSON_VALID(u.subject) AND JSON_CONTAINS(u.subject, ?)) OR CAST(u.subject AS CHAR) LIKE ?)",
          )
          .join(" OR ");

        query += ` AND (${subjectConditions})`;

        subjects.forEach((s) => {
          params.push(JSON.stringify(s));
          params.push(`%${s}%`);
        });
      }
    }

    if (hasValue(search)) {
      const searchLower = String(search).toLowerCase().trim();

      if (searchLower === "online") {
        query += ` AND u.is_online = 'true'`;
      } else if (searchLower === "offline") {
        query += ` AND u.is_online = 'false'`;
      } else {
        query += ` AND (
          u.first_name LIKE ?
          OR u.last_name LIKE ?
          OR CAST(u.location AS CHAR) LIKE ?
          OR up.location LIKE ?
          OR EXISTS (
            SELECT 1 FROM skills s
            WHERE s.user_id = u.id AND CAST(s.skill_name AS CHAR) LIKE ?
          )
          OR EXISTS (
            SELECT 1 FROM locations l
            WHERE l.user_id = u.id AND (
              l.city_name LIKE ? OR l.state_name LIKE ? OR l.area LIKE ?
            )
          )
        )`;
        const like = `%${search}%`;
        params.push(like, like, like, like, like, like, like, like);
      }
    }

    let orderBy = `u.id`;
    if (sortBy === `recent`) {
      orderBy = `u.id DESC`;
    } else if (sortBy === `name`) {
      orderBy = `u.first_name, u.last_name`;
    } else if (sortBy === `rating`) {
      orderBy = `up.rating DESC`;
    } else if (sortBy === `student`) {
      orderBy = `CASE u.role WHEN 'student' THEN 1 WHEN 'teacher' THEN 2 WHEN 'professional' THEN 3 ELSE 4 END`;
    } else if (sortBy === `teacher`) {
      orderBy = `CASE u.role WHEN 'teacher' THEN 1 WHEN 'professional' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
    } else if (sortBy === `profession`) {
      orderBy = `CASE u.role WHEN 'professional' THEN 1 WHEN 'teacher' THEN 2 WHEN 'student' THEN 3 ELSE 4 END`;
    }

    query += `
      ORDER BY ${orderBy}
      LIMIT ${startIndex}, ${pageLimit}
    `;

    mysqlcon.query(query, params, async (err, users) => {
      if (err) {
        console.error("getUsers query error:", err.code, err.sqlMessage);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      const roleCounts = {
        student: 0,
        teacher: 0,
        professional: 0,
      };

      const totalUsersQuery = `
        SELECT COUNT(*) AS totalUsers
        FROM users
        WHERE role IN ('teacher', 'professional', 'student')
      `;

      mysqlcon.query(totalUsersQuery, async (err, totalRes) => {
        if (err) {
          console.error("getUsers total error:", err.code, err.sqlMessage);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        const totalUsers = totalRes[0].totalUsers;

        const enrichUsers = async () => {
          for (let i = 0; i < users.length; i++) {
            let ratingValue = users[i].profile_rating;
            if (ratingValue === undefined || ratingValue === null) {
              ratingValue = await findUserRating(users[i].id);
            }
            users[i].rating =
              ratingValue !== undefined && ratingValue !== null
                ? parseFloat(ratingValue)
                : 0;

            users[i].last_active = await getLastActive(users[i].id);
            users[i].profession = users[i]?.role;

            if (userId && userId !== "undefined" && userId !== "null") {
              users[i].connectionStatus = await getConnectionStatus(
                userId,
                users[i].id,
              ).catch((connErr) => {
                console.log(connErr);
                return null;
              });
            }
          }
        };

        if (
          student === "true" ||
          teacher === "true" ||
          professional === "true"
        ) {
          const roleParams = [];
          if (student === "true") roleParams.push("student");
          if (teacher === "true") roleParams.push("teacher");
          if (professional === "true") roleParams.push("professional");

          const rolePlaceholders = roleParams.map(() => "?").join(", ");
          const roleQuery = `
            SELECT role, COUNT(*) AS count
            FROM users
            WHERE role IN (${rolePlaceholders})
            GROUP BY role
          `;

          mysqlcon.query(roleQuery, roleParams, async (err, counts) => {
            if (err) {
              console.error("getUsers roleCounts error:", err.code, err.sqlMessage);
              return res.status(500).json({ message: "Internal Server Error" });
            }

            (counts || []).forEach((row) => {
              if (row.role === "student") roleCounts.student = row.count;
              if (row.role === "teacher") roleCounts.teacher = row.count;
              if (row.role === "professional")
                roleCounts.professional = row.count;
            });

            try {
              await enrichUsers();
              const expertises = await getAvailableExpertise();
              return res.status(200).json({
                message: "Users Found",
                users,
                expertises,
                roleCounts,
                totalUsers,
              });
            } catch (enrichErr) {
              console.error("getUsers enrich error:", enrichErr);
              return res.status(500).json({ message: "Internal Server Error" });
            }
          });
        } else {
          try {
            await enrichUsers();
            const locations = await getAvailableLocations();
            const expertises = await getAvailableExpertise();
            return res.status(200).json({
              message: "Users Found",
              users,
              locations,
              expertises,
              roleCounts,
              totalUsers,
            });
          } catch (enrichErr) {
            console.error("getUsers enrich error:", enrichErr);
            return res.status(500).json({ message: "Internal Server Error" });
          }
        }
      });
    });
  } catch (error) {
    console.error("getUsers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllTeacher = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const userId = req.query.userId;
    const role = "teacher";

    let sql, params;

    if (userId && userId !== "undefined" && userId !== "null") {
      // Include connection status in query using LEFT JOIN
      sql = `
        SELECT 
          u.id, u.username, u.email, u.display_name, 
          u.first_name, u.last_name, u.avatar_url, u.bio,
          u.rating, u.experience, u.qualification, u.subject,
          u.teaching_method, u.location, u.is_online, u.created_at,
          c.status as connectionStatus
        FROM users u
        LEFT JOIN connections c ON 
          (c.user_id = ? AND c.connected_user_id = u.id) OR
          (c.user_id = u.id AND c.connected_user_id = ?)
        WHERE u.role = ?
        GROUP BY u.id
        ORDER BY u.id DESC
        LIMIT ?
      `;
      params = [userId, userId, role, limit];
    } else {
      // Simple query without connection status
      sql = `
        SELECT *
        FROM users 
        WHERE role = ?
        ORDER BY id DESC
        LIMIT ?
      `;
      params = [role, limit];
    }

    const cacheKey = `teachers_${limit}_${userId || "guest"}`;

    const result = await cachedQuery({
      cacheName: "users",
      cacheKey: cacheKey,
      sql: sql,
      params: params,
      ttl: 120,
    });

    const teachers = result.data.map((teacher) => ({
      ...teacher,
      // Ensure connectionStatus is null if not in query
      connectionStatus: teacher.connectionStatus || null,
    }));

    res.json({
      success: true,
      message: "Teachers fetched successfully",
      data: teachers,
      meta: {
        cached: result.fromCache,
        timestamp: result.timestamp,
        limit: limit,
        total: teachers.length,
      },
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSuggestedExperts = async (req, res) => {
  const {
    userId,
    category,
    search,
    tags,
    skill,
    location,
    expertise,
    rating,
    page,
    limit,
    sort,
  } = req.body;

  // Set default values for pagination and sorting
  const currentPage = page || 1;
  const itemsPerPage = limit || 5;
  const sortField = sort || "first_name";
  const sortOrder = sort === "rating" ? "DESC" : "ASC";

  try {
    // Build the query to fetch suggested users
    let query = `
            SELECT DISTINCT u.id, u.username, u.first_name, u.last_name, u.email, u.avatar_url, e.skill_name, e.id as skill_id, u.role as profession, up.rating as profile_rating
            FROM users u
            LEFT JOIN skills e ON u.id = e.user_id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.role IN ('teacher', 'professional')`;

    // Apply category filter if provided
    // if (category) {
    //   query += ` AND c.name = '${category}'`;
    // }

    // Remove logged in user from the list
    if (userId) {
      query += ` AND u.id != ${userId}`;
    }

    // Apply search filter if provided
    if (search) {
      query += ` AND (u.first_name LIKE '%${search}%' OR u.last_name LIKE '%${search}%' OR u.location LIKE '%${search}%' OR e.skill_name LIKE '%${search}%')`;
    }

    // Apply skill filter if provided
    if (skill && skill !== "undefined") {
      query += ` AND (e.skill_name LIKE '%${skill}%')`;
    }

    // Apply tag filter if provided
    if (tags) {
      const tagIds = JSON.parse(tags)
        .map((tag) => tag.id)
        .join(",");
      query += `
                AND EXISTS (
                    SELECT 1 FROM user_tags ut WHERE ut.user_id = u.id AND ut.tag_id IN (${tagIds})
                )`;
    }

    // Apply location filter if provided
    if (location) {
      query += ` AND u.location LIKE '%${location}%'`;
    }

    // Apply expertise filter if provided
    if (expertise) {
      query += ` AND e.skill_name LIKE '%${expertise}%'`;
    }

    // Apply rating filter if provided
    if (rating) {
      query += ` AND up.rating >= ${rating}`;
    }

    // Add pagination and sorting
    query += ` ORDER BY ${
      sortField === "location"
        ? "u.location"
        : sortField === "rating"
          ? "up.rating"
          : "u.first_name"
    } ${sortOrder} LIMIT ${itemsPerPage} OFFSET ${
      (currentPage - 1) * itemsPerPage
    }`;

    // console.log("Suggested Query: ", query);
    // Execute query to fetch results
    mysqlcon.query(query, async (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      for (let i = 0; i < results.length; i++) {
        let skillName = results[i]?.skill_name;

        if (typeof skillName === "string") {
          // convert "Java, Python, C++" → ["Java", "Python", "C++"]
          results[i].skill_name = skillName.split(",").map((s) => s.trim());
        } else if (Array.isArray(skillName)) {
          // already an array
          results[i].skill_name = skillName;
        } else {
          // null / undefined / invalid → empty array
          results[i].skill_name = [];
        }
      }

      for (let i = 0; i < results.length; i++) {
        const expertise = await findExpertise(results[i]?.id);

        // normalize skill_name
        let skillName = expertise[0]?.skill_name;

        if (typeof skillName === "string") {
          results[i].expertise = skillName.split(",").map((s) => s.trim()); // safe split
        } else if (Array.isArray(skillName)) {
          results[i].expertise = skillName;
        } else {
          results[i].expertise = [];
        }

        // rating, last active (commented out in your code)
        // let rating = await findUserRating(results[i]?.id);
        // results[i].rating = parseFloat(rating);
        // const lastActive = await getLastActive(results[i]?.id);
        // results[i].last_active = lastActive;

        // ✅ Fix condition (your current one always runs because `userId || userId !== "undefined"` is always true)
        if (userId && userId !== "undefined") {
          const connectionStatus = await getConnectionStatus(
            userId,
            results[i].id,
          ).catch((err) => console.log(err));
          results[i].connectionStatus = connectionStatus;
        }
      }

      // Execute query to fetch total count of results
      const countQuery = `
                SELECT COUNT(*) as total
                FROM (${query}) AS countQuery`;

      mysqlcon.query(countQuery, async (countErr, countResult) => {
        if (countErr) {
          console.log(countErr);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        const totalCount = countResult[0].total;

        let locations = await getAvailableLocations();
        let expertises = await getAvailableExpertise();

        return res.status(200).json({
          message: "Users Found",
          results,
          totalCount,
          locations,
          expertises,
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getJobProfiles = (req, res) => {
  const { userId } = req.params;

  try {
    const getUserDetailsQuery = `
      SELECT
        s.skill_name,
        s.proficiency,
        e.education_name,
        e.institution,
        c.certification_name,
        c.organization,
        w.company_name,
        w.position,
        r.research_name,
        r.organization
      FROM users AS u
      LEFT JOIN skills AS s ON u.id = s.user_id
      LEFT JOIN educations AS e ON u.id = e.user_id
      LEFT JOIN certifications AS c ON u.id = c.user_id
      LEFT JOIN work_experiences AS w ON u.id = w.user_id
      LEFT JOIN research AS r ON u.id = r.user_id 
      WHERE u.id = ?;
    `;

    mysqlcon.query(getUserDetailsQuery, [userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Organize the retrieved data
      const userDetails = {
        skills: [],
        educations: [],
        certifications: [],
        workExperiences: [],
        research: [],
      };

      result.forEach((row) => {
        if (row.skill_name && row.proficiency) {
          userDetails.skills.push({
            skillName: row.skill_name,
            proficiency: row.proficiency,
          });
        }

        if (row.education_name && row.institution) {
          userDetails.educations.push({
            educationName: row.education_name,
            institution: row.institution,
          });
        }

        if (row.certification_name && row.organization) {
          userDetails.certifications.push({
            certificationName: row.certification_name,
            organization: row.organization,
          });
        }

        if (row.company_name && row.position) {
          userDetails.workExperiences.push({
            companyName: row.company_name,
            position: row.position,
          });
        }

        if (row.research_name && row.organization) {
          userDetails.research.push({
            researchName: research_name,
            organization: row.organization,
          });
        }
      });

      res.json({ userDetails });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// API endpoint to get recent users
// const getRecentUsers = async (req, res) => {
//   const limit = req.query.limit || 3; // Number of recent users to retrieve

//   // SQL query to fetch recent users
//   const query = `SELECT DISTINCT
//     u.id,
//     u.first_name,
//     u.last_name,
//     u.avatar_url,
//     u.location,
//     u.username,
//     u.role,
//     u.show_contact_details,
//     up.education,
//     up.profession,
//     (SELECT COUNT(*) FROM user_profiles) AS total_users
//     FROM users AS u
//     INNER JOIN user_profiles AS up ON u.id = up.user_id
//     LEFT JOIN skills AS s ON u.id = s.user_id
//     WHERE 1 = 1
//     ${verifyValue(userRoleCondition) ? ` AND (${userRoleCondition})` : ""}
//     ${verifyValue(ratings) ? ` AND up.rating = '${ratings}'` : ""}
//     ${verifyValue(location) ? ` AND u.location LIKE '%${location}%'` : ""}
//     ${
//       verifyValue(skill)
//         ? ` AND s.skill_name = '${skill}' AND s.proficiency_level = 'Expert'`
//         : ""
//     }
//     `;

//   try {
//     // Execute query
//     mysqlcon.query(query, async (err, results) => {
//       if (err) {
//         console.error("Error fetching recent users: ", err);
//         return res.status(500).json({ message: "Internal Server Error" });
//       }

//       for (let i = 0; i < results.length; i++) {
//         const expertise = await findExpertise(results[i].id);
//         results[i].expertise = expertise[0]?.skill_name
//           ? expertise[0].skill_name.split(", ")
//           : [];
//         let rating = await findUserRating(results[i].id);
//         results[i].rating = parseFloat(rating);
//         const lastActive = await getLastActive(results[i].id);
//         results[i].last_active = lastActive;
//       }

//       // Send the recent users as the API response
//       res.status(200).json({
//         message: "Users Found",
//         results,
//       });
//     });
//   } catch (error) {
//     console.error("Error fetching recent users: ", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// NEW

const getRecentUsers = async (req, res) => {
  const limit = req.query.limit || 3; // Number of recent users to retrieve

  // SQL query to fetch recent users - ORDERED BY registration date
  const query = `SELECT DISTINCT
    u.id,
    u.first_name,
    u.last_name,
    u.avatar_url,
    u.location,
    u.username,
    u.role,
    u.show_contact_details,
    u.created_at,  // Make sure this field exists in your users table
    up.education,
    up.profession,
    (SELECT COUNT(*) FROM user_profiles) AS total_users
    FROM users AS u 
    INNER JOIN user_profiles AS up ON u.id = up.user_id
    LEFT JOIN skills AS s ON u.id = s.user_id
    WHERE 1 = 1
    ${verifyValue(userRoleCondition) ? ` AND (${userRoleCondition})` : ""}
    ${verifyValue(ratings) ? ` AND up.rating = '${ratings}'` : ""}
    ${verifyValue(location) ? ` AND u.location LIKE '%${location}%'` : ""}
    ${
      verifyValue(skill)
        ? ` AND s.skill_name = '${skill}' AND s.proficiency_level = 'Expert'`
        : ""
    }
    ORDER BY u.created_at DESC  -- Order by registration date (newest first)
    LIMIT ${limit}  -- Limit to the specified number of users
    `;

  try {
    // Execute query
    mysqlcon.query(query, async (err, results) => {
      if (err) {
        console.error("Error fetching recent users: ", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      for (let i = 0; i < results.length; i++) {
        const expertise = await findExpertise(results[i].id);
        results[i].expertise = expertise[0]?.skill_name
          ? expertise[0].skill_name.split(", ")
          : [];
        let rating = await findUserRating(results[i].id);
        results[i].rating = parseFloat(rating);
        const lastActive = await getLastActive(results[i].id);
        results[i].last_active = lastActive;
      }

      // Send the recent users as the API response
      res.status(200).json({
        message: "Users Found",
        results,
      });
    });
  } catch (error) {
    console.error("Error fetching recent users: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getProfileCompletion = async (req, res) => {
  const userId = req.params.userId; // Assuming you have authentication middleware to extract the user ID

  if (isNaN(userId)) {
    return res.status(409).json({ message: "Invalid User ID" });
  }

  // Define the fields that contribute to the profile completion
  const profileFields = [
    "avatar_url" || "",
    "display_name",
    "first_name",
    "last_name",
    "location",
    "phone",
    "bio",
    "role",
    "gender",
    "dob",
    "profession",
    "designation",
    "institute",
    "education",
    "address_line_1",
    "address_line_2",
    "city",
    "state",
    "country",
    "zip_code",
    "website",
    "twitter",
    "facebook",
    "instagram",
    "youtube",
    "vimeo",
    "github",
    "linkedin",
    "skills",
    "educations",
    "certifications",
    "work_experience",
    "research",
    // Add more fields as needed
  ];

  try {
    // Fetch the user's profile data from the database or any other data source
    const profileData = await fetchUserProfile(userId).catch((error) =>
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

const getUserProfession = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(403).json({ message: "UserID is missing" });
  }

  const catcheKey = "user_profession";
  try {
    const result = await cachedQuery({
      cacheKey: catcheKey,
      catcheName: "lists",
      sql: `SELECT profession FROM user_profiles WHERE user_id = ${userId}`,
      ttl: 120,
    });
    const response = result.data;
    return res.status(200).json({
      message: "OK",
      profession: response[0].profession,
    });
  } catch (error) {
    console.log(error);
    return result.status(500).json({ message: "Internal Server Error" });
  }
};
//get Institutes data
const getInstituteData = async (req, res) => {
  try {
    const { location } = req.query;
    // console.log("Location is +++++++++++++++== ",location)
    if (!location) {
      return res
        .status(400)
        .json({ message: "Location parameter is required" });
    }

    const cacheKey = "institute_list";
    const resulte = await cachedQuery({
      cacheKey: cacheKey,
      cacheName: "lists",
      sql: `
      SELECT ip.*, i.name, i.email, i.mobile
      FROM institute_profiles ip
      JOIN institutes i ON ip.institute_id = i.id
      WHERE ip.state = ? OR ip.city = ?
    `,
      ttl: 120,
      params: [location, location],
    });
    const institutes = resulte.data;
    console.log("resultes is ", institutes);
    if (institutes.length === 0) {
      return res.status(404).json({ message: "Institute not found" });
    }

    return res.status(200).json({
      message: "Institutes Found",
      institutes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
//get Teachersdata based on user location
const getTeachersData = async (req, res) => {
  try {
    const { location } = req.params;
    //get all the teachers based on location
    const teachers = await Teachers.findAll({
      where: {
        [Op.or]: [{ city: location }, { state: location }],
      },
    });
    return res.status(200).json({
      message: "Teachers Found",
      teachers,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//teachers vote
const Teachervote = (req, res) => {
  const teacherId = req.params.id;
  const { rating, user_id } = req.body;

  const sqlTeacher = `SELECT * FROM Teachers WHERE id=?`;
  mysqlcon.query(sqlTeacher, [teacherId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const teacher = result[0];

    const sqlCheckVote = `SELECT * FROM ratings WHERE user_id=? AND rated_user_id=?`;
    mysqlcon.query(sqlCheckVote, [user_id, teacherId], (err2, voteResult) => {
      if (voteResult.length > 0) {
        return res
          .status(400)
          .json({ error: "You have already voted for this teacher" });
      }

      const newTotalVotes = teacher.votes + 1;
      const newRating =
        (teacher.rating * teacher.votes + rating) / newTotalVotes;

      const sqlInsertVote = `INSERT INTO ratings (user_id, rated_user_id, rating) VALUES (?,?,?)`;
      mysqlcon.query(sqlInsertVote, [user_id, teacherId, rating]);

      const sqlUpdateTeacher = `UPDATE Teachers SET rating=?, votes=? WHERE id=?`;
      mysqlcon.query(sqlUpdateTeacher, [newRating, newTotalVotes, teacherId]);

      res.json({ ...teacher, rating: newRating, votes: newTotalVotes });
    });
  });
};

//Instittute vote
const Institutevote = async (req, res) => {
  const instituteId = parseInt(req.params.id);
  const { rating, user_id } = req.body;

  try {
    const institute = await InstituteProfile.findByPk(instituteId);
    if (!institute) {
      return res.status(404).json({ error: "Institute not found" });
    }

    // Check if the user has already voted for this institute
    const existingVote = await ratings.findOne({
      where: {
        user_id: user_id,
        rated_user_id: instituteId,
      },
    });
    if (existingVote) {
      return res
        .status(400)
        .json({ message: "you have already voted for this institute" });
    }

    let newTotalVotes = institute.votes;
    let newRating;
    // Calculate the new rating for a new vote
    newTotalVotes = institute.votes + 1;
    newRating = (institute.rating * institute.votes + rating) / newTotalVotes;
    // Record the new user's vote
    await ratings.create({
      user_id: user_id,
      rated_user_id: instituteId,
      rating: rating,
    });

    // Update the institute's rating and votes count
    await institute.update({ rating: newRating, votes: newTotalVotes });

    res.json(institute);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal server error");
  }
};

// const users = async (req, res) => {
//   const query = `SELECT * FROM users`;
//   mysqlcon.query(query, (err, results) => {
//     if (err) {
//       console.log("err", err);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//     if (results.length > 0) {
//       res.json({ success: true, users: results });
//     } else {
//       res.status(404).json({ success: false, message: "No users found" });
//     }
//   });
// };

// Your getGyaniForRating function here
const users = async (req, res) => {
  try {
    const cacheKey = "users_list";
    const result = await cachedQuery({
      cacheKey: cacheKey,
      cacheName: "lists",
      sql: `
    SELECT 
      users.*,
      user_profiles.id as profile_id,
      user_profiles.bio,
      user_profiles.first_name,
      user_profiles.middle_name,
      user_profiles.last_name,
      user_profiles.gender,
      user_profiles.dob,
      user_profiles.profession,
      user_profiles.designation,
      user_profiles.institute,
      user_profiles.workinformation,
      user_profiles.profile_pic,
      user_profiles.cover_photo_url,
      user_profiles.location,
      user_profiles.rating,
      user_profiles.website_url,
      user_profiles.linkedin_link,
      user_profiles.twitter_link,
      user_profiles.github_link,
      user_profiles.facebook_link,
      user_profiles.instagram_link,
      user_profiles.youtube_link,
      user_profiles.vimeo_link,
      user_profiles.skills,
      user_profiles.work_experience,
      user_profiles.education,
      user_profiles.certifications,
      user_profiles.classLevel,
      user_profiles.selectedSubjects,
      user_profiles.selectedExpertise,
      user_profiles.teachingClasses,
      user_profiles.teachAllSubjects,
      user_profiles.school,
      user_profiles.board
    FROM users
    LEFT JOIN user_profiles ON users.id = user_profiles.user_id
  `,
      ttl: 120,
    });
    const results = result.data;

    if (results.length > 0) {
      const pageNum = parseInt(req.query.page, 10) || 1;
      const pageLimit = parseInt(req.query.limit, 10) || 12;
      const start = (pageNum - 1) * pageLimit;
      const paginatedUsers = results.slice(start, start + pageLimit);
      res.json({
        success: true,
        users: paginatedUsers,
        totalUsers: results.length,
      });
    } else {
      res.status(404).json({ success: false, message: "No users found" });
    }
  } catch (error) {
    console.error("Server error: ", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getGyaniForRating = async (req, res) => {
  try {
    const userId = req.query.userId;

    console.log("Gyanis found : ", userId);

    const query = `
      SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.email, u.role
      FROM users u
      JOIN (
          SELECT DISTINCT a.user_id AS answerer_id
          FROM answers a
          JOIN questions q ON a.question_id = q.id
          WHERE q.user_id = ? AND a.is_rated = 0
      ) AS answerers ON u.id = answerers.answerer_id
      WHERE u.id != ? AND u.role != 'student';`;
    // Querying the database
    mysqlcon.query(query, [userId, userId], (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      return res
        .status(200)
        .json({ message: "Gyani's found Successfully", results });
    });
  } catch (error) {
    console.error("Error fetching gyani users:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching gyani users." });
  }
};

const useContactVisibility = async (req, res) => {
  const { id } = req.params;
  const { show_contact_details } = req.body;

  console.log("params: ", req.params);
  console.log("show_contact_details: ", req.body);

  try {
    await DBMODELS.users.update({ show_contact_details }, { where: { id } });
    res.status(200).json({ success: true, show_contact_details });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const checkConnectionStatus = async (req, res) => {
  try {
    const { myId, otherId } = req.query;
    if (!myId || !otherId) {
      return res
        .status(400)
        .json({ message: "Both myId and otherId are required" });
    }

    // Assuming DBMODELS.connections is the correct model for connections
    const connection = await DBMODELS.connections.findOne({
      where: {
        [Op.or]: [
          { sender_id: myId, receiver_id: otherId },
          { sender_id: otherId, receiver_id: myId },
        ],
        status: "accepted",
      },
    });

    if (connection) {
      return res.status(200).json({ connected: true });
    } else {
      return res.status(200).json({ connected: false });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getTeacherSameLocation = async (req, res) => {
  try {
    const { location } = req.query || req.params;

    if (!location || location === "undefined" || location === "null") {
      return res.status(400).json({
        success: false,
        message: "Location parameter is required",
      });
    }

    // Clean location parameter
    const cleanLocation = location.trim();
    const cacheKey = `teachers_location_${cleanLocation}`;

    const result = await cachedQuery({
      cacheName: "users",
      cacheKey: cacheKey,
      sql: `SELECT * FROM users WHERE location LIKE ? AND role ='teacher'`,
      params: [`%${cleanLocation}%`],
      ttl: 300, // 5 minutes cache
    });

    if (result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No teachers found for this location",
      });
    }

    // Format teachers to match your exact output
    const formattedTeachers = result.data.map((teacher) => {
      // Only parse subject field (from JSON string to array)
      let parsedSubject = teacher.subject;

      try {
        // Parse subject if it's a JSON array string
        if (
          typeof teacher.subject === "string" &&
          teacher.subject.startsWith("[")
        ) {
          parsedSubject = JSON.parse(teacher.subject);
        }
      } catch (error) {
        console.error("Error parsing subject for teacher:", teacher.id, error);
        // If parsing fails, keep as is or make it an array
        if (typeof teacher.subject === "string") {
          parsedSubject = [teacher.subject];
        }
      }

      // Return teacher in exact format from your example
      return {
        id: teacher.id,
        username: teacher.username,
        email: teacher.email,
        password: teacher.password,
        role: teacher.role,
        display_name: teacher.display_name,
        first_name: teacher.first_name,
        middle_name: teacher.middle_name,
        last_name: teacher.last_name,
        location: teacher.location, // Keep as JSON string
        nearestLocation: teacher.nearestLocation,
        phone: teacher.phone,
        bio: teacher.bio,
        avatar_url: teacher.avatar_url,
        status: teacher.status,
        is_online: teacher.is_online, // Keep as string "false"/"true"
        updatedAt: teacher.updatedAt,
        createdAt: teacher.createdAt,
        show_contact_details: teacher.show_contact_details, // Keep as number 0/1
        subject: parsedSubject, // This should be array
        teaching_method: teacher.teaching_method,
        qualification: teacher.qualification,
        experience: teacher.experience,
        rating: teacher.rating,
        login_count: teacher.login_count,
        is_verified: teacher.is_verified, // Keep as number 0/1
      };
    });

    return res.status(200).json({
      success: true,
      teachers: formattedTeachers,
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const filterByCityStateAndCountry = (req, res) => {
  try {
    const { city, state, country } = req.query;

    let sql = "SELECT * FROM users WHERE 1=1";
    const values = [];

    if (country) {
      sql += ` AND (
                  (JSON_VALID(location) AND JSON_UNQUOTE(JSON_EXTRACT(location, '$.country')) = ?)
                  OR (NOT JSON_VALID(location) AND location LIKE ?)
                )`;
      values.push(country, `%${country}%`);
    }

    if (state) {
      sql += ` AND (
                  (JSON_VALID(location) AND JSON_UNQUOTE(JSON_EXTRACT(location, '$.state')) = ?)
                  OR (NOT JSON_VALID(location) AND location LIKE ?)
                )`;
      values.push(state, `%${state}%`);
    }

    if (city) {
      sql += ` AND (
                  (JSON_VALID(location) AND JSON_UNQUOTE(JSON_EXTRACT(location, '$.city')) = ?)
                  OR (NOT JSON_VALID(location) AND location LIKE ?)
                )`;
      values.push(city, `%${city}%`);
    }

    mysqlcon.query(sql, values, (err, rows) => {
      if (err) {
        console.error("DB error: ", err);
        return res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }
      if (rows && rows.length > 0) {
        return res.status(200).json({ success: true, data: rows });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "No users found" });
      }
    });
  } catch (error) {
    console.error("Server error: ", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getCities = async (req, res) => {
  try {
    const cacheKey = `city_list`;

    const result = await cachedQuery({
      cacheName: "lists",
      cacheKey: cacheKey,
      sql: `
        SELECT DISTINCT 
          CASE 
            WHEN JSON_VALID(location) AND JSON_EXTRACT(location, '$.city') IS NOT NULL
              THEN JSON_UNQUOTE(JSON_EXTRACT(location, '$.city'))
            ELSE location
          END AS city
        FROM users
        WHERE location IS NOT NULL 
          AND location <> ''
          AND TRIM(location) <> '{}'
        ORDER BY city
      `,
      ttl: 600, // 10 minutes cache for city list
    });

    // Map rows into an array of city names
    const cities = result.data
      .map((row) => row.city)
      .filter((c) => c && c.trim() !== "") // remove null/empty
      .sort(); // Optional: sort alphabetically

    return res.status(200).json({
      success: true,
      cities,
      meta: {
        cached: result.fromCache,
        timestamp: result.timestamp,
        count: cities.length,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getTeachingClasses = async (req, res) => {
  try {
    const cachekey = "class_list";

    const result = await cachedQuery({
      cacheKey: cachekey,
      cacheName: "lists",
      sql: `
      SELECT DISTINCT class_name
      FROM subjects
      WHERE class_name IS NOT NULL AND class_name <> ''
    `,
      ttl: 120,
    });

    const rows = result.data;
    const classes = [
      ...new Set(
        rows
          .map((row) => row.class_name && row.class_name.trim())
          .filter(Boolean),
      ),
    ];

    return res.status(200).json({ success: true, classes });
  } catch (error) {
    console.error("Server error: ", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// const getSubjects = (req, res) => {
//   try {
//     const sql = `
//       SELECT DISTINCT subj AS subject
//       FROM (
//         -- Case 1: subject_name stored as JSON array
//         SELECT jt.subject AS subj
//         FROM subjects
//         JOIN JSON_TABLE(
//           subjects.subject_name,
//           '$[*]' COLUMNS(subject VARCHAR(255) PATH '$')
//         ) jt
//         WHERE JSON_VALID(subjects.subject_name)
//           AND JSON_TYPE(subjects.subject_name) = 'ARRAY'

//         UNION

//         -- Case 2: subject_name stored as plain string (non-JSON)
//         SELECT subjects.subject_name AS subj
//         FROM subjects
//         WHERE NOT JSON_VALID(subjects.subject_name)

//         UNION

//         -- Case 3: subject_name stored as JSON string (like "Math")
//         SELECT JSON_UNQUOTE(subjects.subject_name) AS subj
//         FROM subjects
//         WHERE JSON_VALID(subjects.subject_name)
//           AND JSON_TYPE(subjects.subject_name) = 'STRING'
//       ) final
//       WHERE subj IS NOT NULL;
//     `;

//     mysqlcon.query(sql, (err, rows) => {
//       if (err) {
//         console.error("DB error: ", err.sqlMessage);
//         return res.status(500).json({
//           success: false,
//           message: "Internal Server Error",
//         });
//       }

//       // Clean + unique subjects
//       const subjects = [
//         ...new Set(
//           rows.map((row) => row.subject && row.subject.trim()).filter(Boolean)
//         ),
//       ];

//       return res.status(200).json({ success: true, subjects });
//     });
//   } catch (error) {
//     console.error("Server error: ", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

const getSubjects = async (req, res) => {
  try {
    const cacheKey = `subject_list`;

    const result = await cachedQuery({
      cacheKey: cacheKey,
      cacheName: "lists",
      sql: `
        SELECT DISTINCT subj AS subject
        FROM (
          -- Case 1: subject_name stored as JSON array
          SELECT jt.subject AS subj
          FROM subjects
          JOIN JSON_TABLE(
            subjects.subject_name,
            '$[*]' COLUMNS(subject VARCHAR(255) PATH '$')
          ) jt
          WHERE JSON_VALID(subjects.subject_name)
            AND JSON_TYPE(subjects.subject_name) = 'ARRAY'

          UNION

          -- Case 2: subject_name stored as plain string (non-JSON)
          SELECT subjects.subject_name AS subj
          FROM subjects
          WHERE NOT JSON_VALID(subjects.subject_name)

          UNION

          -- Case 3: subject_name stored as JSON string (like "Math")
          SELECT JSON_UNQUOTE(subjects.subject_name) AS subj
          FROM subjects
          WHERE JSON_VALID(subjects.subject_name)
            AND JSON_TYPE(subjects.subject_name) = 'STRING'
        ) final
        WHERE subj IS NOT NULL;
      `,
      ttl: 600, // 10 minutes cache
    });

    const rows = result.data;

    // Clean + unique subjects
    const subjects = [
      ...new Set(
        rows.map((row) => row.subject && row.subject.trim()).filter(Boolean),
      ),
    ];

    // Optional: Add cache info to response for debugging
    const response = {
      success: true,
      subjects,
      cacheInfo: {
        fromCache: result.fromCache,
        timestamp: result.timestamp,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in getSubjects:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const filterBySubject = async (req, res) => {
  try {
    const { subject } = req.query;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Please provide a subject",
      });
    }

    // Sanitize subject for cache key
    const sanitizedSubject = subject.toLowerCase().trim();
    const cacheKey = `subject_filter_${sanitizedSubject}`;

    const result = await cachedQuery({
      cacheKey: cacheKey,
      cacheName: "search", // Using 'search' cache which has 60s TTL
      sql: `
        SELECT *
        FROM users
        WHERE 
          (
            -- Case 1: subject is JSON array
            JSON_VALID(subject)
            AND JSON_TYPE(subject) = 'ARRAY'
            AND EXISTS (
              SELECT 1
              FROM JSON_TABLE(
                subject,
                '$[*]' COLUMNS(sub VARCHAR(255) PATH '$')
              ) jt
              WHERE LOWER(jt.sub) = ?
            )
          )
          OR
          (
            -- Case 2: subject stored as plain string (not JSON)
            NOT JSON_VALID(subject)
            AND LOWER(subject) = ?
          )
          OR
          (
            -- Case 3: subject stored as JSON string (e.g. "Social Science")
            JSON_VALID(subject)
            AND JSON_TYPE(subject) = 'STRING'
            AND LOWER(JSON_UNQUOTE(subject)) = ?
          )
      `,
      params: [sanitizedSubject, sanitizedSubject, sanitizedSubject],
      ttl: 60, // 1 minute cache for search results
    });

    const rows = result.data;

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found with this subject",
        cacheInfo: {
          fromCache: result.fromCache,
          timestamp: result.timestamp,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: rows,
      cacheInfo: {
        fromCache: result.fromCache,
        timestamp: result.timestamp,
      },
    });
  } catch (error) {
    console.error("Error in filterBySubject:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const SendTutorConect = async (req, res) => {
  try {
    const {
      receiverEmail,
      subject,
      senderName,
      receiverName,
      senderEmail,
      senderUserId,
      frontendUrl,
    } = req.body;

    let emailSent = await sendEmailService.sendTutorConnectRequest(
      receiverEmail,
      subject,
      senderName,
      receiverName,
      senderEmail,
      senderUserId,
      frontendUrl,
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
    console.log("Error is ", error);
  }
};

const sendWelcomeMailController = async (req, res) => {
  try {
    const { userEmail, username, role, profilelink, firstName, lastName } =
      req.body;
    let emailSent = await sendEmailService.sendWelcomeMail(
      userEmail,
      username,
      role,
      profilelink,
      firstName,
      lastName,
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
    console.log("error is", error);
  }
};

// GET /api/students/recent?city=Mumbai
// Get 5 most recent registered students with city filtering

// const getRecentUsersWithLocation = (req, res) => {
//   const { city } = req.query; // example: ?city=Mumbai
// console.log("city is ",city)
//   try {
//     let users = [];

//     if (city) {
//       // First, try to get users from the specified city
//       const citySql = `
//         SELECT id, username, email, display_name, first_name, middle_name,
//                last_name, location, nearestLocation, phone, bio, avatar_url,
//                subject, teaching_method, qualification, experience, rating,
//                role, createdAt
//         FROM users
//         WHERE role IN ('student', 'teacher', 'professional')
//         AND status = 'active'
//         AND (location LIKE ? OR nearestLocation LIKE ?)
//         ORDER BY createdAt DESC
//         LIMIT 5
//       `;

//       mysqlcon.query(citySql, [`%${city}%`, `%${city}%`], (err, cityUsers) => {
//         if (err) {
//           console.error('Error fetching users:', err);
//           return res.status(500).json({
//             success: false,
//             message: 'Error fetching users',
//             error: err.message
//           });
//         }

//         users = cityUsers;

//         // If we have less than 2 users from the specified city,
//         // fill the remaining with Delhi users
//         if (users.length < 2) {
//           const remainingSlots = 5 - users.length;

//           // Get user IDs we already have to exclude them
//           const excludeIds = users.map(s => s.id);
//           const excludeClause = excludeIds.length > 0
//             ? `AND id NOT IN (${excludeIds.join(',')})`
//             : '';

//           const delhiSql = `
//             SELECT id, username, email, display_name, first_name, middle_name,
//                    last_name, location, nearestLocation, phone, bio, avatar_url,
//                    subject, teaching_method, qualification, experience, rating,
//                    role, createdAt
//             FROM users
//             WHERE role IN ('student', 'teacher', 'professional')
//             AND status = 'active'
//             AND (location LIKE '%Delhi%' OR nearestLocation LIKE '%Delhi%')
//             ${excludeClause}
//             ORDER BY createdAt DESC
//             LIMIT ?
//           `;

//           mysqlcon.query(delhiSql, [remainingSlots], (err, delhiUsers) => {
//             if (err) {
//               console.error('Error fetching Delhi users:', err);
//               return res.status(500).json({
//                 success: false,
//                 message: 'Error fetching Delhi users',
//                 error: err.message
//               });
//             }

//             users = [...users, ...delhiUsers];

//             return res.status(200).json({
//               success: true,
//               count: users.length,
//               city: city,
//               message: users.length < 5
//                 ? `Found ${cityUsers.length} users from ${city}, filled remaining with Delhi users`
//                 : `Found users from ${city}`,
//               data: users
//             });
//           });
//         } else {
//           return res.status(200).json({
//             success: true,
//             count: users.length,
//             city: city,
//             message: `Found users from ${city}`,
//             data: users
//           });
//         }
//       });

//     } else {
//       // No city specified, get 5 most recent users from Delhi
//       const delhiSql = `
//         SELECT id, username, email, display_name, first_name, middle_name,
//                last_name, location, nearestLocation, phone, bio, avatar_url,
//                subject, teaching_method, qualification, experience, rating,
//                role, createdAt
//         FROM users
//         WHERE role IN ('student', 'teacher', 'professional')
//         AND status = 'active'
//         AND (location LIKE '%Delhi%' OR nearestLocation LIKE '%Delhi%')
//         ORDER BY createdAt DESC
//         LIMIT 5
//       `;

//       mysqlcon.query(delhiSql, (err, delhiUsers) => {
//         if (err) {
//           console.error('Error fetching Delhi users:', err);
//           return res.status(500).json({
//             success: false,
//             message: 'Error fetching Delhi users',
//             error: err.message
//           });
//         }

//         return res.status(200).json({
//           success: true,
//           count: delhiUsers.length,
//           city: 'Delhi',
//           message: 'Showing recent users from Delhi (default)',
//           data: delhiUsers
//         });
//       });
//     }

//   } catch (error) {
//     console.error('Error in try-catch:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error fetching recent students',
//       error: error.message
//     });
//   }
// };
// Helper function to process users data

const getRecentUsersWithLocation = (req, res) => {
  const { city } = req.query; // example: ?city=Mumbai
  console.log("city is ", city);

  try {
    if (city) {
      // First, try to get 5 users from the specified city
      const citySql = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.username,
          u.role,
          u.show_contact_details,
          u.is_online,
          u.subject,
          u.location,
          u.rating,
          up.education,
          up.profession,
          l.city_name,
          l.pincode,
          l.district,
          l.state_name,
          l.area,
          GROUP_CONCAT(DISTINCT s.skill_name ORDER BY s.skill_name ASC SEPARATOR '", "') AS skills
        FROM users AS u
        LEFT JOIN user_profiles AS up ON u.id = up.user_id
        LEFT JOIN skills AS s ON u.id = s.user_id
        LEFT JOIN locations AS l ON u.id = l.user_id
        WHERE u.role IN ('student', 'teacher', 'professional')
        AND u.status = 'active'
        AND (
          u.location LIKE ?
          OR l.city_name LIKE ?
          OR (u.location IS NOT NULL AND u.location != '' AND JSON_VALID(u.location) AND JSON_UNQUOTE(JSON_EXTRACT(u.location, '$.city')) LIKE ?)
        )
        GROUP BY u.id, up.education, up.profession, l.city_name, l.pincode, l.district, l.state_name, l.area
        ORDER BY u.createdAt DESC
        LIMIT 5
      `;

      mysqlcon.query(
        citySql,
        [`%${city}%`, `%${city}%`, `%${city}%`],
        async (err, cityUsers) => {
          if (err) {
            console.error("Error fetching users by location:", err);
            return res.status(500).json({
              success: false,
              message: "Error fetching users",
              error: err.message,
            });
          }

          // If less than 2 users found, fill remaining with Delhi users
          if (cityUsers.length < 2) {
            const remainingSlots = 5 - cityUsers.length;
            const excludeIds = cityUsers.map((u) => u.id);
            const excludeClause =
              excludeIds.length > 0
                ? `AND u.id NOT IN (${excludeIds.join(",")})`
                : "";

            const delhiSql = `
            SELECT 
              u.id,
              u.first_name,
              u.last_name,
              u.avatar_url,
              u.username,
              u.role,
              u.show_contact_details,
              u.is_online,
              u.subject,
              u.location,
              u.rating,
              up.education,
              up.profession,
              l.city_name,
              l.pincode,
              l.district,
              l.state_name,
              l.area,
              GROUP_CONCAT(DISTINCT s.skill_name ORDER BY s.skill_name ASC SEPARATOR '", "') AS skills
            FROM users AS u
            LEFT JOIN user_profiles AS up ON u.id = up.user_id
            LEFT JOIN skills AS s ON u.id = s.user_id
            LEFT JOIN locations AS l ON u.id = l.user_id
            WHERE u.role IN ('student', 'teacher', 'professional')
            AND u.status = 'active'
            ${excludeClause}
            AND (
              u.location LIKE '%Delhi%'
              OR l.city_name LIKE '%Delhi%'
              OR (u.location IS NOT NULL AND u.location != '' AND JSON_VALID(u.location) AND JSON_UNQUOTE(JSON_EXTRACT(u.location, '$.city')) LIKE '%Delhi%')
            )
            GROUP BY u.id, up.education, up.profession, l.city_name, l.pincode, l.district, l.state_name, l.area
            ORDER BY u.createdAt DESC
            LIMIT ?
          `;

            mysqlcon.query(
              delhiSql,
              [remainingSlots],
              async (err, delhiUsers) => {
                if (err) {
                  console.error("Error fetching Delhi users:", err);
                  return res.status(500).json({
                    success: false,
                    message: "Error fetching Delhi users",
                    error: err.message,
                  });
                }

                const allUsers = [...cityUsers, ...delhiUsers];
                const processedUsers = await processUsers(allUsers);

                return res.status(200).json({
                  success: true,
                  count: processedUsers.length,
                  city: city,
                  message: `Found ${cityUsers.length} users from ${city}, filled remaining with ${delhiUsers.length} Delhi users`,
                  data: processedUsers,
                });
              },
            );
          } else {
            // 2 or more users found from specified city
            const processedUsers = await processUsers(cityUsers);

            return res.status(200).json({
              success: true,
              count: processedUsers.length,
              city: city,
              message: `Found ${cityUsers.length} users from ${city}`,
              data: processedUsers,
            });
          }
        },
      );
    } else {
      // No city specified, get 5 users from Delhi by default
      const delhiSql = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.username,
          u.role,
          u.show_contact_details,
          u.is_online,
          u.subject,
          u.location,
          u.rating,
          up.education,
          up.profession,
          l.city_name,
          l.pincode,
          l.district,
          l.state_name,
          l.area,
          GROUP_CONCAT(DISTINCT s.skill_name ORDER BY s.skill_name ASC SEPARATOR '", "') AS skills
        FROM users AS u
        LEFT JOIN user_profiles AS up ON u.id = up.user_id
        LEFT JOIN skills AS s ON u.id = s.user_id
        LEFT JOIN locations AS l ON u.id = l.user_id
        WHERE u.role IN ('student', 'teacher', 'professional')
        AND u.status = 'active'
        AND (
          u.location LIKE '%Delhi%'
          OR l.city_name LIKE '%Delhi%'
          OR (u.location IS NOT NULL AND u.location != '' AND JSON_VALID(u.location) AND JSON_UNQUOTE(JSON_EXTRACT(u.location, '$.city')) LIKE '%Delhi%')
        )
        GROUP BY u.id, up.education, up.profession, l.city_name, l.pincode, l.district, l.state_name, l.area
        ORDER BY u.createdAt DESC
        LIMIT 5
      `;

      mysqlcon.query(delhiSql, async (err, delhiUsers) => {
        if (err) {
          console.error("Error fetching Delhi users:", err);
          return res.status(500).json({
            success: false,
            message: "Error fetching Delhi users",
            error: err.message,
          });
        }

        const processedUsers = await processUsers(delhiUsers);

        return res.status(200).json({
          success: true,
          count: processedUsers.length,
          city: "Delhi",
          message: `Showing ${processedUsers.length} recent users from Delhi (default)`,
          data: processedUsers,
        });
      });
    }
  } catch (error) {
    console.error("Error in try-catch:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// const getLength = async (req, res) => {
//   try {
//     const sql = `
//       SELECT
//         COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
//         COUNT(CASE WHEN role = 'professional' THEN 1 END) as professionals,
//         COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teachers
//       FROM users`;

//     mysqlcon.query(sql, (error, results) => {
//       if (error) {
//         console.error('Database error:', error);
//         return res.status(500).json({
//           success: false,
//           message: 'Failed to fetch user counts',
//           error: error.message
//         });
//       } else {
//         return res.status(200).json({
//           success: true,
//           data: results[0]
//         });
//       }
//     });

//   } catch (error) {
//     console.error('Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };

const getLength = async (req, res) => {
  try {
    const cacheName = "counts";
    const cacheKey = "user_counts"; // Fixed key for this query

    const result = await cachedQuery({
      cacheName: cacheName,
      cacheKey: cacheKey,
      sql: `
        SELECT 
          COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
          COUNT(CASE WHEN role = 'professional' THEN 1 END) as professionals,
          COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teachers,
          COUNT(*) as total
        FROM users
        WHERE status = 'active' OR status IS NULL
      `,
      ttl: 300, // 5 minutes, matches cache config
    });

    const response = {
      success: true,
      data: result.data[0] || {},
      meta: {
        cached: result.fromCache,
        timestamp: result.timestamp,
        cacheKey: cacheKey,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user counts",
      error: error.message,
    });
  }
};

const getInstituteLength = async (req, res) => {
  try {
    const cacheName = "counts";
    const cacheKey = "institute_count";

    // Check cache first
    const cachedData = getFromCache(cacheName, cacheKey);

    if (cachedData !== undefined) {
      return res.status(200).json({
        success: true,
        message: "Institute count fetched successfully (from cache)",
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    const sql = `SELECT COUNT(*) AS institutes FROM institutes`;

    // Execute query with promise
    const results = await new Promise((resolve, reject) => {
      mysqlcon.query(sql, (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });

    const data = results[0] || { institutes: 0 };

    // Store in cache
    setToCache(cacheName, cacheKey, data);

    return res.status(200).json({
      success: true,
      message: "Institute count fetched successfully",
      data: data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch institute count",
      error: error.message,
    });
  }
};

// const getRecentUsers = async (req,res)=>{

// }

const getUserWithRole = async (req, res) => {
  try {
    let { page = 1, limit = 10, role = "" } = req.query;

    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
  u.id AS user_id,
  u.first_name,
  u.last_name,
  u.middle_name,
  u.role,
  u.email,
  u.rating,
  u.subject,
  l.id AS location_id,
  l.city_name,


  s.id AS skill_id,
  s.skill_name
FROM users u
LEFT JOIN locations l ON u.id = l.user_id
LEFT JOIN skills s ON u.id = s.user_id
WHERE u.role = ?
ORDER BY u.createdAt DESC
LIMIT ? OFFSET ?
    `;

    mysqlcon.query(query, [role, limit, offset], (err, rows) => {
      if (err) return res.status(500).json(err);

      res.json({
        page,
        count: rows.length,
        data: rows,
      });
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports = {
  // updateActivity,
  getRecentUsersWithLocation,
  sendWelcomeMailController,
  SendTutorConect,
  getTeachingClasses,
  filterBySubject,
  getSubjects,
  getCities,
  filterByCityStateAndCountry,
  getTeacherSameLocation,
  users,
  updateUser,
  updateUserProfile,
  updateUserSocialLinks,
  getUserProfile,
  getUser,
  createUser,
  getUsers,
  getSuggestedExperts,
  getJobProfiles,
  getRecentUsers,
  getUserByUsername,
  getProfileCompletion,
  getUserProfession,
  getInstituteData,
  getTeachersData,
  Teachervote,
  Institutevote,
  getGyaniForRating,
  useContactVisibility,
  checkConnectionStatus,
  getAllTeacher,
  getLength,
  getInstituteLength,
  getUserWithRole,
};
