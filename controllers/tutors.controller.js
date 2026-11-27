const { mysqlcon } = require("../model/db");
const slugify  = require("slugify")
const { DBMODELS } = require("../models/init-models");
const { createJWT } = require("../service/auth.service");
const {
  createUsernameForUser,
  generateOTP,
} = require("../service/auth.service");
const path = require("path");
const ejs = require("ejs");

const moment = require("moment/moment");
const { sendEmailService, sendTemplatedEmail } = require("../utils/email");
const { cachedQuery } = require("../utils/db-cache-wrapper");
const { deleteFromCache } = require("../utils/catch-manage");
const {
  ensureTutorNeedViewsTables,
} = require("../utils/ensureTutorNeedViews");
const {
  ensureTutorConnectDefaults,
} = require("../utils/ensureTutorConnect");
const {
  insertNotification,
} = require("../service/connectionNotify.service");

const TUTOR_LIST_CACHE_KEY = "tutor_list_valid_7d";
const TUTOR_NEED_TTL_DAYS = 7;

const invalidateTutorListCache = () => {
  try {
    deleteFromCache("lists", TUTOR_LIST_CACHE_KEY);
    deleteFromCache("lists", "tutor_list");
  } catch (_) {
    /* ignore */
  }
};

// Public Tutors tab: only verified needs, auto-hidden after 1 week (no schema change)
const getTutors = async (req, res) => {
  try {
    await ensureTutorConnectDefaults();

    // Soft-expire older posts so they leave Careers → Tutors
    try {
      await mysqlcon.promise().query(
        `UPDATE tutors SET isValid = 0
         WHERE isValid = 1
           AND createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [TUTOR_NEED_TTL_DAYS]
      );
    } catch (e) {
      console.error("tutor soft-expire:", e?.message || e);
    }

    const result = await cachedQuery({
      cacheName: "lists",
      cacheKey: TUTOR_LIST_CACHE_KEY,
      sql: `SELECT * FROM tutors
            WHERE isValid = 1
              AND createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY createdAt DESC`,
      params: [TUTOR_NEED_TTL_DAYS],
      ttl: 120,
    });

    // Never expose email/phone on the list — reveal via POST /:tutorId/view { viewType: contact }
    const role = String(req.user?.role || "").toLowerCase();
    const canRevealContact = role === "teacher" || role === "professional";
    const viewerId = req.user?.id ? Number(req.user.id) : null;

    const rows = (result.data || []).map((t) => {
      // Per-viewer UI status: only the requester sees "Request Sent"
      let connectionStatus = t.connectionStatus || "process";
      if (connectionStatus === "pending") {
        const requesterId = t.requester_id != null ? Number(t.requester_id) : null;
        if (!viewerId || requesterId !== viewerId) {
          connectionStatus = "process";
        }
      }
      return {
        ...t,
        email: null,
        phone: null,
        requester_id: undefined,
        contactLocked: !canRevealContact,
        connectionStatus,
      };
    });

    res.json(rows);
  } catch (error) {
    console.error("Error fetching tutors:", error);
    return res.status(500).json({ error: "Database error" });
  }
}; 

// // Create a new tutor
// const registerTutor = async (req, res) => {
//   const { name, email, phone, subject, city, state, country, class} = req.body;

//   if (!name || !email || !phone || !subject || !city || !state || !class) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   try {
//     // check if tutor already exists
//     const [existingTutor] = await mysqlcon
//       .promise()
//       .query("SELECT * FROM tutors WHERE email = ?", [email]);

//     if (existingTutor.length > 0) {
//       return res.status(400).json({ error: "Tutor already registered" });
//     }

//     // ✅ check if user exists and active
//     const [existingUser] = await mysqlcon
//       .promise()
//       .query("SELECT * FROM users WHERE email = ? AND status = 'active'", [
//         email,
//       ]);

//     let tutorId;

//     if (existingUser.length > 0) {
//       // ✅ If user is active, register tutor as already valid
//       const [result] = await mysqlcon.promise().query(
//         `INSERT INTO tutors (name, email, phone, subject, city, state, country, isValid)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [name, email, phone, subject, city, state, country || "India", true]
//       );

//       tutorId = result.insertId;

//       return res.json({
//         success: true,
//         message: "Tutor registered successfully (User already active).",
//         tutorId,
//       });
//     }

//     // ❌ Otherwise → normal OTP flow
//     const [result] = await mysqlcon.promise().query(
//       `INSERT INTO tutors (name, email, phone, subject, city, state, country, isValid)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [name, email, phone, subject, city, state, country || "India", false]
//     );

//     tutorId = result.insertId;

//     console.log("tutorId", tutorId);
//     // generate OTP
//     const clientotp = generateOTP();
//     const expiryTime = new Date(moment().add(10, "minutes"));

//     // save OTP in otp table
//     await DBMODELS.otp.create({
//       user_id: tutorId,
//       code: clientotp,
//       expired_at: expiryTime,
//     });

//     // send OTP email
//     let mailConfig = {
//       email,
//       subject: `Your Verification OTP is ${clientotp}`,
//     };
//     const replacements = {
//       name,
//       otpCode: clientotp,
//       expirationTime: "10 Minutes",
//     };
//     sendTemplatedEmail(mailConfig, replacements, "SEND_OTP");

//     res.json({
//       success: true,
//       message: "OTP sent successfully. Please verify to activate tutor.",
//       tutorId,
//     });
//   } catch (err) {
//     console.error("Register Tutor Error:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// const registerTutor = async (req, res) => {
//   const { name, email, phone, subject, city, state, country, class: classList } = req.body;

//   if (!name || !email || !phone || !subject || !city || !state || !classList) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   try {
//     // Check if tutor already exists
//     const [existingTutor] = await mysqlcon
//       .promise()
//       .query("SELECT * FROM tutors WHERE email = ?", [email]);

//     let tutorId;

//     if (existingTutor.length > 0) {
//       const tutor = existingTutor[0];
      
//       // Parse existing subjects and classes (stored as comma-separated strings)
//       const existingSubjects = tutor.subject ? tutor.subject.split(',').map(s => s.trim()) : [];
//       const existingClasses = tutor.class ? tutor.class.split(',').map(c => c.trim()) : [];
      
//       // Convert new subjects and classes to arrays if they're not already
//       const newSubjects = Array.isArray(subject) ? subject : [subject];
//       const newClasses = Array.isArray(classList) ? classList : [classList];
      
//       // Find unique subjects and classes that don't exist already
//       const uniqueSubjects = newSubjects.filter(sub => !existingSubjects.includes(sub));
//       const uniqueClasses = newClasses.filter(cls => !existingClasses.includes(cls));
      
//       // If there are new subjects or classes to add
//       if (uniqueSubjects.length > 0 || uniqueClasses.length > 0) {
//         // Combine existing and new unique subjects/classes
//         const updatedSubjects = [...existingSubjects, ...uniqueSubjects].join(',');
//         const updatedClasses = [...existingClasses, ...uniqueClasses].join(',');
        
//         // Update the tutor record with new subjects and classes
//         await mysqlcon.promise().query(
//           `UPDATE tutors SET subject = ?, class = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
//           [updatedSubjects, updatedClasses, tutor.id]
//         );
        
//         tutorId = tutor.id;
        
//         return res.json({
//           success: true,
//           message: "Tutor profile updated with new subjects and/or classes.",
//           tutorId,
//           addedSubjects: uniqueSubjects,
//           addedClasses: uniqueClasses
//         });
//       } else {
//         // No new subjects or classes to add
//         return res.status(400).json({ 
//           error: "Tutor already registered with the same subjects and classes" 
//         });
//       }
//     }

//     // ✅ Check if user exists and active
//     const [existingUser] = await mysqlcon
//       .promise()
//       .query("SELECT * FROM users WHERE email = ? AND status = 'active'", [email]);

//     // Convert subjects and classes to comma-separated strings
//     const subjectsString = Array.isArray(subject) ? subject.join(',') : subject;
//     const classesString = Array.isArray(classList) ? classList.join(',') : classList;

//     if (existingUser.length > 0) {
//       // ✅ If user is active, register tutor as already valid (no OTP needed)
//       const [result] = await mysqlcon.promise().query(
//         `INSERT INTO tutors (name, email, phone, subject, class, city, state, country, isValid)
//          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           name, 
//           email, 
//           phone, 
//           subjectsString, 
//           classesString, 
//           city, 
//           state, 
//           country || "India", 
//           true
//         ]
//       );

//       tutorId = result.insertId;

//       return res.json({
//         success: true,
//         message: "Tutor registered successfully (User already active).",
//         tutorId,
//       });
//     }

//     // ❌ New user (not in users table or not active) → OTP flow required
//     const [result] = await mysqlcon.promise().query(
//       `INSERT INTO tutors (name, email, phone, subject, class, city, state, country, isValid)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         name, 
//         email, 
//         phone, 
//         subjectsString, 
//         classesString, 
//         city, 
//         state, 
//         country || "India", 
//         false
//       ]
//     );

//     tutorId = result.insertId;

//     console.log("tutorId", tutorId);
//     // Generate OTP
//     const clientotp = generateOTP();
//     const expiryTime = new Date(moment().add(10, "minutes"));

//     // Save OTP in otp table
//     await DBMODELS.otp.create({
//       user_id: tutorId,
//       code: clientotp,
//       expired_at: expiryTime,
//     });

//     // Send OTP email
//     let mailConfig = {
//       email,
//       subject: `Your Verification OTP is ${clientotp}`,
//     };
//     const replacements = {
//       name,
//       otpCode: clientotp,
//       expirationTime: "10 Minutes",
//     };
//     sendTemplatedEmail(mailConfig, replacements, "SEND_OTP");

//     res.json({
//       success: true,
//       message: "OTP sent successfully. Please verify to activate tutor.",
//       tutorId,
//     });
//   } catch (err) {
//     console.error("Register Tutor Error:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


/** Soft wall post for tutor search/update — never fails the main request */
const softPostTutorWall = async ({
  userId,
  title,
  brief,
  notification,
  tags = {},
}) => {
  try {
    const slug =
      (typeof slugify === "function"
        ? slugify(String(title || "tutor"), { lower: true, strict: true })
        : generateSlug(title || "tutor")) +
      "-" +
      Date.now();
    await mysqlcon.promise().query(
      `INSERT INTO questions
        (title, slug, tags, body, brief, isPost, notification, is_answered, user_id, is_hidden, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, ?, 'open', ?, 0, NOW(), NOW())`,
      [
        String(title).slice(0, 250),
        slug.slice(0, 200),
        JSON.stringify({ ...tags, wall: true, type: notification }),
        brief || title,
        String(brief || title).slice(0, 500),
        String(notification).slice(0, 50),
        userId || null,
      ]
    );
  } catch (e) {
    console.error("softPostTutorWall:", e?.message || e);
  }
};

const registerTutor = async (req, res) => {
  let { name, email, phone, subject, city, state, country, class: classList } = req.body;

  if (!name || !email || !phone || !subject || !city || !state || !classList) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await ensureTutorConnectDefaults();

    // Logged-in posters always own the listing under their account (ignore form email typos)
    const authedUserId = req.user?.id ? Number(req.user.id) : null;
    const authedEmail = String(req.user?.email || "").trim();
    if (authedUserId && authedEmail) {
      email = authedEmail;
    }

    const [existingTutor] = await mysqlcon
      .promise()
      .query("SELECT * FROM tutors WHERE email = ?", [email]);

    let tutorId;

    // Convert subjects and classes to arrays for processing
    const subjectsArray = Array.isArray(subject) ? subject : [subject];
    const classesArray = Array.isArray(classList) ? classList : [classList];
    
    // Convert to comma-separated strings for database storage
    const subjectsString = subjectsArray.join(',');
    const classesString = classesArray.join(',');

    // Guests with an existing row: keep one search profile (merge).
    // Logged-in users always get a NEW tutor-need row (My Tutor Requests lists each post separately).
    if (existingTutor.length > 0 && !authedUserId) {
      const tutor = existingTutor[0];
      tutorId = tutor.id;

      // If this tutor email is already a portal user, guests must log in
      const [linkedUser] = await mysqlcon
        .promise()
        .query(
          "SELECT id FROM users WHERE email = ? AND status = 'active' LIMIT 1",
          [email]
        );
      if (linkedUser.length > 0) {
        return res.status(409).json({
          success: false,
          requiresLogin: true,
          error:
            "This email is already registered on EkSathi. Please log in to continue.",
        });
      }

      // Parse existing subjects and classes (stored as comma-separated strings)
      const existingSubjects = tutor.subject ? tutor.subject.split(',').map(s => s.trim()) : [];
      const existingClasses = tutor.class ? tutor.class.split(',').map(c => c.trim()) : [];
      
      // Find unique subjects and classes that don't exist already
      const uniqueSubjects = subjectsArray.filter(sub => !existingSubjects.includes(sub));
      const uniqueClasses = classesArray.filter(cls => !existingClasses.includes(cls));
      
      // If there are new subjects or classes to add
      if (uniqueSubjects.length > 0 || uniqueClasses.length > 0) {
        // Combine existing and new unique subjects/classes
        const updatedSubjects = [...existingSubjects, ...uniqueSubjects].join(',');
        const updatedClasses = [...existingClasses, ...uniqueClasses].join(',');
        
        // Refresh listing window so a re-post is live again
        await mysqlcon.promise().query(
          `UPDATE tutors SET subject = ?, class = ?, city = ?, state = ?, country = ?,
              isValid = 1, createdAt = CURRENT_TIMESTAMP,
              updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [
            updatedSubjects,
            updatedClasses,
            city,
            state,
            country || "India",
            tutor.id,
          ]
        );
        
        const [user] = await mysqlcon.promise().query(
          "SELECT id FROM users WHERE email = ? LIMIT 1",
          [email]
        );
        await softPostTutorWall({
          userId: user[0]?.id || null,
          title: `${name} is searching for tutors`,
          brief: `${name} updated tutor search: ${subjectsArray.join(", ")} in ${city}.`,
          notification: "tutor_search",
          tags: { subjects: subjectsArray, classes: classesArray, city },
        });

        invalidateTutorListCache();
        
        return res.json({
          success: true,
          message: "Tutor profile updated with new subjects and/or classes.",
          tutorId,
          addedSubjects: uniqueSubjects,
          addedClasses: uniqueClasses,
          city,
          subject: subjectsArray[0] || null,
          expiresInDays: TUTOR_NEED_TTL_DAYS,
        });
      } else {
        // Same subjects/classes — refresh so listing stays live while searching
        await mysqlcon.promise().query(
          `UPDATE tutors SET city = ?, state = ?, country = ?, isValid = 1,
              createdAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [city, state, country || "India", tutor.id]
        );
        return res.json({
          success: true,
          message: "Tutor profile updated — searching matching tutors.",
          tutorId,
          city,
          subject: subjectsArray[0] || null,
          alreadyRegistered: true,
          expiresInDays: TUTOR_NEED_TTL_DAYS,
        });
      }
    }

    // ✅ Check if user exists and active
    const [existingUser] = await mysqlcon
      .promise()
      .query("SELECT * FROM users WHERE email = ? AND status = 'active'", [email]);

    if (existingUser.length > 0) {
      // Guest used an already-registered account email → ask them to log in
      const authedId = req.user?.id;
      if (!authedId || String(authedId) !== String(existingUser[0].id)) {
        return res.status(409).json({
          success: false,
          requiresLogin: true,
          error:
            "This email is already registered on EkSathi. Please log in to continue.",
        });
      }

      // Logged-in owner: insert a new need (email unique may still exist on old DBs)
      const ownerId = authedUserId || existingUser[0].id;
      let tutorIdLocal;
      try {
        const [result] = await mysqlcon.promise().query(
          `INSERT INTO tutors (name, email, phone, subject, class, city, state, country, isValid, connectionStatus, posted_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'process', ?)`,
          [
            name,
            email,
            phone,
            subjectsString,
            classesString,
            city,
            state,
            country || "India",
            true,
            ownerId,
          ]
        );
        tutorIdLocal = result.insertId;
      } catch (insertErr) {
        // Fallback when UNIQUE(email) still present: refresh the latest owned row
        if (
          insertErr?.code === "ER_DUP_ENTRY" ||
          String(insertErr?.message || "").includes("Duplicate")
        ) {
          const [owned] = await mysqlcon.promise().query(
            `SELECT id FROM tutors
             WHERE posted_by_user_id = ?
                OR LOWER(TRIM(email)) = LOWER(TRIM(?))
             ORDER BY id DESC LIMIT 1`,
            [ownerId, email]
          );
          if (!owned?.length) throw insertErr;
          tutorIdLocal = owned[0].id;
          await mysqlcon.promise().query(
            `UPDATE tutors
             SET name = ?, phone = ?, subject = ?, class = ?, city = ?, state = ?,
                 country = ?, isValid = 1, connectionStatus = 'process',
                 posted_by_user_id = ?, createdAt = CURRENT_TIMESTAMP,
                 updatedAt = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              name,
              phone,
              subjectsString,
              classesString,
              city,
              state,
              country || "India",
              ownerId,
              tutorIdLocal,
            ]
          );
        } else {
          throw insertErr;
        }
      }

      tutorId = tutorIdLocal;

      await softPostTutorWall({
        userId: ownerId,
        title: `${name} is searching for tutors`,
        brief: `${name} is looking for ${subjectsArray.join(", ")} tutors in ${city}, ${state}.`,
        notification: "tutor_search",
        tags: { subjects: subjectsArray, classes: classesArray, city },
      });

      invalidateTutorListCache();

      return res.json({
        success: true,
        message: "Tutor registered successfully (User already active).",
        tutorId,
        city,
        subject: subjectsArray[0] || null,
        expiresInDays: TUTOR_NEED_TTL_DAYS,
      });
    }

    // ❌ New user (not in users table or not active) → OTP flow required
    const [result] = await mysqlcon.promise().query(
      `INSERT INTO tutors (name, email, phone, subject, class, city, state, country, isValid, connectionStatus, posted_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'process', ?)`,
      [
        name, 
        email, 
        phone, 
        subjectsString, 
        classesString, 
        city, 
        state, 
        country || "India", 
        false,
        authedUserId || null,
      ]
    );

    tutorId = result.insertId;

    console.log("tutorId", tutorId);
    // Generate OTP
    const clientotp = generateOTP();
    const expiryTime = new Date(moment().add(10, "minutes"));

    // Save OTP in otp table
    await DBMODELS.otp.create({
      user_id: tutorId,
      code: clientotp,
      expired_at: expiryTime,
    });

    // Send OTP email
    let mailConfig = {
      email,
      subject: `Your Verification OTP is ${clientotp}`,
    };
    const replacements = {
      name,
      otpCode: clientotp,
      expirationTime: "10 Minutes",
    };
    sendTemplatedEmail(mailConfig, replacements, "SEND_OTP");

    res.json({
      success: true,
      message: "OTP sent successfully. Please verify to activate tutor.",
      tutorId,
      city,
      subject: subjectsArray[0] || null,
      expiresInDays: TUTOR_NEED_TTL_DAYS,
    });
  } catch (err) {
    console.error("Register Tutor Error:", err);
    const detail =
      err?.code === "ER_DUP_ENTRY"
        ? "A tutor search with this email already exists. Please try again or update your existing request."
        : err?.sqlMessage || err?.message || "Internal Server Error";
    res.status(500).json({
      error: "Internal Server Error",
      details: process.env.NODE_ENV === "production" ? undefined : detail,
      message: detail,
    });
  }
};



// Helper function to generate slug (add this if you don't have one)
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '')             // Trim - from end of text
    .substring(0, 500);             // Limit to 500 chars for slug field
}
// Verfiy tutor Otp
const verifyTutorOTP = async (req, res) => {
  const { tutorId, otp } = req.body;

  if (!tutorId || !otp) {
    return res.status(400).json({ error: "Missing OTP or tutorId" });
  }

  try {
    // find OTP record
    const otpRecord = await DBMODELS.otp.findOne({
      where: { user_id: tutorId, code: otp },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (new Date() > otpRecord.expired_at) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // activate tutor
    await mysqlcon
      .promise()
      .query("UPDATE tutors SET isValid = ? WHERE id = ?", [true, tutorId]);

    // delete OTP record
    await DBMODELS.otp.destroy({ where: { id: otpRecord.id } });

    invalidateTutorListCache();

    res.json({
      success: true,
      message: "Tutor verified and activated successfully",
      expiresInDays: TUTOR_NEED_TTL_DAYS,
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const canManageTutorRow = async (req, tutorId) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (role === "admin" || role === "superadmin") return true;
  const email = req.user?.email;
  if (!email) return false;
  const [rows] = await mysqlcon
    .promise()
    .query("SELECT id, email FROM tutors WHERE id = ? LIMIT 1", [tutorId]);
  if (!rows.length) return false;
  return String(rows[0].email).toLowerCase() === String(email).toLowerCase();
};

// Update a tutor by ID
const updateTutor = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, subject, city, state, country, isValid } =
    req.body;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Tutor ID is required" });
  }

  try {
    if (!(await canManageTutorRow(req, id))) {
      return res.status(403).json({ error: "Not allowed to update this listing" });
    }

    const query = `
      UPDATE tutors
      SET name = ?, email = ?, phone = ?, subject = ?, city = ?, state = ?,
          country = ?, isValid = ?, updatedAt = NOW()
      WHERE id = ?
    `;
    const params = [
      name,
      email,
      phone,
      typeof subject === "string" ? subject : JSON.stringify(subject || []),
      city,
      state,
      country || "India",
      isValid ? 1 : 0,
      Number(id),
    ];

    mysqlcon.query(query, params, (err, result) => {
      if (err) {
        console.error("Error updating tutor:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      invalidateTutorListCache();
      res.json({ message: "Tutor updated successfully" });
    });
  } catch (err) {
    console.error("Error updating tutor:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete a tutor by ID
const deleteTutor = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Tutor ID is required" });
  }

  try {
    if (!(await canManageTutorRow(req, id))) {
      return res.status(403).json({ error: "Not allowed to delete this listing" });
    }

    mysqlcon.query(
      "DELETE FROM tutors WHERE id = ?",
      [Number(id)],
      (err, result) => {
        if (err) {
          console.error("Error deleting tutor:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Tutor not found" });
        }
        invalidateTutorListCache();
        res.json({ message: "Tutor deleted successfully" });
      }
    );
  } catch (err) {
    console.error("Error deleting tutor:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};




const getTutorById = (req, res) => {
  try {
    const tutorId = req.params.id;
    // Fixed SQL query - was missing column name after 'where'
    const query = "SELECT * FROM tutors WHERE id = ?";
    mysqlcon.query(query, [tutorId], (err, results) => {
      if (err) {
        console.error("Error fetching tutor:", err);
        return res.status(500).json({
          success: false,
          error: "Database error",
          message: "Failed to fetch tutor details",
        });
      }

      // Check if tutor exists
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Tutor not found",
          message: "No tutor found with the provided ID",
        });
      }

      // Return the tutor data (first result since ID should be unique)
      res.status(200).json({
        success: true,
        data: results[0],
        message: "Tutor details fetched successfully",
      });
    });
  } catch (error) {
    console.error("Error in getTutorById:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
      message: "An unexpected error occurred",
    });
  }
};


const SendTutorConnect = async (req, res) => {
  try {
    await ensureTutorConnectDefaults();

    const {
      subject,
      senderName,
      receiverName,
      senderEmail,
      frontendUrl,
    } = req.body;

    const tutorId = parseInt(req.params.tutorId, 10);
    const senderUserId = req.user?.id;

    // Only verified Teachers / Professionals may reach out
    const senderRole = String(req.user?.role || "").toLowerCase();
    if (senderRole !== "teacher" && senderRole !== "professional") {
      return res.status(403).json({
        success: false,
        message:
          "Only verified Teachers and Professionals can contact tutor-need posters.",
      });
    }

    if (!tutorId || Number.isNaN(tutorId) || !senderUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid tutor ID or login required",
      });
    }

    const [tutorResult] = await mysqlcon.promise().query(
      `SELECT id, email, name, connectionStatus, requester_id, posted_by_user_id
       FROM tutors WHERE id = ? LIMIT 1`,
      [tutorId]
    );

    if (!tutorResult.length) {
      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    const tutor = tutorResult[0];
    const receiverEmail = String(tutor.email || "").trim();
    if (!receiverEmail) {
      return res.status(400).json({
        success: false,
        message: "Poster contact email is missing",
      });
    }

    // Already requested by this sender
    if (
      tutor.connectionStatus === "pending" &&
      Number(tutor.requester_id) === Number(senderUserId)
    ) {
      return res.status(400).json({
        success: false,
        message: "You already sent a connection request for this listing",
      });
    }

    // Someone else already connected / pending — still allow? One global pending for MVP
    if (
      tutor.connectionStatus === "pending" &&
      tutor.requester_id &&
      Number(tutor.requester_id) !== Number(senderUserId)
    ) {
      return res.status(400).json({
        success: false,
        message: "This listing already has a pending connection request",
      });
    }

    if (tutor.connectionStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Tutor is already connected with someone",
      });
    }

    const resolvedSenderName =
      senderName ||
      `${req.user?.first_name || ""} ${req.user?.last_name || ""}`.trim() ||
      "A teacher";
    const resolvedReceiverName = receiverName || tutor.name || "there";
    const resolvedSenderEmail = senderEmail || req.user?.email;

    // Persist request first so UI/status work even if SMTP is flaky
    await mysqlcon.promise().query(
      `UPDATE tutors SET connectionStatus = 'pending', requester_id = ? WHERE id = ?`,
      [senderUserId, tutorId]
    );
    invalidateTutorListCache();

    // Count this teacher as listing + contact viewer
    try {
      await ensureTutorNeedViewsTables();
      await mysqlcon.promise().query(
        `INSERT IGNORE INTO tutor_need_views (tutor_id, viewer_id, view_type) VALUES (?, ?, 'listing')`,
        [tutorId, senderUserId]
      );
      await mysqlcon.promise().query(
        `INSERT IGNORE INTO tutor_need_views (tutor_id, viewer_id, view_type) VALUES (?, ?, 'contact')`,
        [tutorId, senderUserId]
      );
    } catch (viewErr) {
      console.error("tutor connect view count:", viewErr?.message || viewErr);
    }

    // In-app notification to poster account
    try {
      let receiverUserId = tutor.posted_by_user_id
        ? Number(tutor.posted_by_user_id)
        : null;
      if (!receiverUserId) {
        const [receiverUsers] = await mysqlcon.promise().query(
          `SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`,
          [receiverEmail]
        );
        receiverUserId = receiverUsers?.[0]?.id
          ? Number(receiverUsers[0].id)
          : null;
      }
      if (receiverUserId && receiverUserId !== Number(senderUserId)) {
        await insertNotification({
          senderId: senderUserId,
          receiverId: receiverUserId,
          type: 4,
          contentId: tutorId,
          message: `${resolvedSenderName} wants to connect about your tutor request`,
        });
      } else if (!receiverUserId) {
        console.warn(
          "tutor connect: no account for poster email",
          receiverEmail
        );
      }
    } catch (notifyErr) {
      console.error("tutor connect notify:", notifyErr?.message || notifyErr);
    }

    // Email is best-effort — do not fail the connect if SMTP fails
    try {
      await sendTutorConnectRequest(
        receiverEmail,
        subject || "New connection Request",
        resolvedSenderName,
        resolvedReceiverName,
        resolvedSenderEmail,
        senderUserId,
        frontendUrl || "https://www.eksathi.com/"
      );
    } catch (mailErr) {
      console.error("tutor connect email:", mailErr?.message || mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Connection request sent successfully",
    });
  } catch (error) {
    console.error("Error in SendTutorConnect:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Cancel Tutor Connection Request
const CancelTutorRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const tutorId = req.params.tutorId;

    // Validate IDs (user from JWT only)
    if (!userId || !tutorId || isNaN(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or tutor ID",
      });
    }

    // Check if tutor exists and has pending status - SECURE QUERY
    const checkTutorQuery = "SELECT id, connectionStatus FROM tutors WHERE id = ?";
    mysqlcon.query(checkTutorQuery, [parseInt(tutorId)], (err, tutorResult) => {
      if (err) {
        console.error("Error checking tutor:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      if (tutorResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      const tutor = tutorResult[0];

      if (tutor.connectionStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: "No pending connection request found for this tutor",
        });
      }

      // Reset tutor status to 'process' - SECURE QUERY
      const updateTutorQuery =
        "UPDATE tutors SET connectionStatus = ?, requester_id = NULL WHERE id = ?";
      mysqlcon.query(updateTutorQuery, ['process', parseInt(tutorId)], (err, updateResult) => {
        if (err) {
          console.error("Error updating tutor status:", err);
          return res.status(500).json({
            success: false,
            message: "Database error",
          });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Tutor not found",
          });
        }

        invalidateTutorListCache();

        return res.status(200).json({
          success: true,
          message: "Connection request cancelled successfully",
        });
      });
    });

  } catch (error) {
    console.error("Error in CancelTutorRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Accept Tutor Connection Request
const AcceptTutorRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const tutorId = req.params.tutorId;

    // Validate IDs (user from JWT only)
    if (!userId || !tutorId || isNaN(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or tutor ID",
      });
    }

    // Check if tutor exists and has pending status - SECURE QUERY
    const checkTutorQuery = "SELECT id, name, email, connectionStatus FROM tutors WHERE id = ?";
    mysqlcon.query(checkTutorQuery, [parseInt(tutorId)], (err, tutorResult) => {
      if (err) {
        console.error("Error checking tutor:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      if (tutorResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      const tutor = tutorResult[0];

      if (tutor.connectionStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: "No pending connection request found for this tutor",
        });
      }

      // Update tutor's connection status to 'completed' - SECURE QUERY
      const updateTutorQuery = 'UPDATE tutors SET connectionStatus = ? WHERE id = ?';
      mysqlcon.query(updateTutorQuery, ['completed', parseInt(tutorId)], async (err, updateResult) => {
        if (err) {
          console.error("Error updating tutor status:", err);
          return res.status(500).json({
            success: false,
            message: "Database error",
          });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Tutor not found",
          });
        }

        // Send confirmation emails (optional - you can remove this if you don't have user table)
        try {
          await sendConnectionAcceptedEmails(
            tutor,
            { name: 'Student', email: req.body.userEmail || 'student@example.com' },
            req.body.frontendUrl || "https://www.eksathi.com/"
          );
        } catch (emailError) {
          console.error("Error sending confirmation emails:", emailError);
          // Continue even if email fails
        }

        return res.status(200).json({
          success: true,
          message: "Connection request accepted successfully",
        });
      });
    });

  } catch (error) {
    console.error("Error in AcceptTutorRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Reject Tutor Connection Request
const RejectTutorRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const tutorId = req.params.tutorId;

    // Validate IDs (user from JWT only)
    if (!userId || !tutorId || isNaN(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or tutor ID",
      });
    }

    // Check if tutor exists and has pending status - SECURE QUERY
    const checkTutorQuery = "SELECT id, connectionStatus FROM tutors WHERE id = ?";
    mysqlcon.query(checkTutorQuery, [parseInt(tutorId)], (err, tutorResult) => {
      if (err) {
        console.error("Error checking tutor:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      if (tutorResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      const tutor = tutorResult[0];

      if (tutor.connectionStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: "No pending connection request found for this tutor",
        });
      }

      // Reset tutor status to 'process' - SECURE QUERY
      const updateTutorQuery = 'UPDATE tutors SET connectionStatus = ? WHERE id = ?';
      mysqlcon.query(updateTutorQuery, ['process', parseInt(tutorId)], (err, updateResult) => {
        if (err) {
          console.error("Error updating tutor status:", err);
          return res.status(500).json({
            success: false,
            message: "Database error",
          });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Tutor not found",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Connection request rejected successfully",
        });
      });
    });

  } catch (error) {
    console.error("Error in RejectTutorRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get Connection Status
const GetConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    const tutorId = req.params.tutorId;

    // Get connection status between user and tutor
    const [connection] = await mysqlcon.execute(
      `SELECT status, sender_id, receiver_id FROM tutor_connections 
       WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?)`,
      [userId, tutorId, tutorId, userId]
    );

    let connectionStatus = "process"; // Default status
    let userRole = null; // 'sender' or 'receiver'

    if (connection.length > 0) {
      connectionStatus = connection[0].status;
      userRole = connection[0].sender_id == userId ? "sender" : "receiver";
    }

    // Get tutor's overall connection status
    const [tutorStatus] = await mysqlcon.execute(
      "SELECT connectionStatus FROM tutors WHERE id = ?",
      [tutorId]
    );

    return res.status(200).json({
      success: true,
      data: {
        connectionStatus,
        tutorConnectionStatus: tutorStatus[0]?.connectionStatus || "process",
        userRole,
      },
    });
  } catch (error) {
    console.error("Error in GetConnectionStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Email service function for sending connection requests
const sendTutorConnectRequest = async (
  receiverEmail,
  subject,
  senderName,
  receiverName,
  senderEmail,
  senderUserId,
  frontendUrl
) => {
  try {
    const filePath = path.join(
      __dirname,
      "../views/NotTutorConnectionsRequest.ejs"
    );
    const confirmfilePath = path.join(__dirname, "../views/confirm-tutor.ejs");

    const htmlToSend = await ejs.renderFile(filePath, {
      senderName,
      receiverName,
      senderEmail,
      senderUserId,
      frontendUrl,
    });

    const confirmhtmltosend = await ejs.renderFile(confirmfilePath, {
      senderName,
      receiverName,
      senderEmail,
      senderUserId,
      frontendUrl,
    });

    // Send email to receiver (tutor)
    // await  sendEmailService(receiverEmail, subject, htmlToSend);
    await   sendEmailService(receiverEmail, subject, htmlToSend);

    // Send confirmation email to sender
    await sendEmailService(
      senderEmail,
      `${subject} - Confirmation`,
      confirmhtmltosend
    );

    return true;
  } catch (error) {
    console.error("❌ Error sending dynamic EJS templated email:", error);
    return false;
  }
};

// Email service function for sending connection accepted emails
const sendConnectionAcceptedEmails = async (
  tutorInfo,
  userInfo,
  frontendUrl
) => {
  try {
    const acceptedFilePath = path.join(
      __dirname,
      "../views/connection-accepted.ejs"
    );

    // Email to tutor
    const tutorHtml = await ejs.renderFile(acceptedFilePath, {
      recipientName: tutorInfo.name,
      connectedWithName: userInfo.name,
      connectedWithEmail: userInfo.email,
      frontendUrl,
      userType: "tutor",
    });

    // Email to user
    const userHtml = await ejs.renderFile(acceptedFilePath, {
      recipientName: userInfo.name,
      connectedWithName: tutorInfo.name,
      connectedWithEmail: tutorInfo.email,
      frontendUrl,
      userType: "student",
    });

    // Send emails
    await sendEmailService(
      tutorInfo.email,
      "Connection Request Accepted",
      tutorHtml
    );
    await sendEmailService(
      userInfo.email,
      "Connection Request Accepted",
      userHtml
    );

    return true;
  } catch (error) {
    console.error("❌ Error sending connection accepted emails:", error);
    return false;
  }
};

const UpdateTutorConnectionStatus = async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const { connectionStatus } = req.body;

    // Validate tutorId
    if (!tutorId || isNaN(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tutor ID",
      });
    }

    // Validate connectionStatus
    if (!connectionStatus || !['process', 'pending', 'completed'].includes(connectionStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection status. Must be 'process', 'pending', or 'completed'",
      });
    }

    // Update tutor's connection status - SECURE QUERY
    const updateQuery = 'UPDATE tutors SET connectionStatus = ? WHERE id = ?';
    mysqlcon.query(updateQuery, [connectionStatus, parseInt(tutorId)], (err, result) => {
      if (err) {
        console.error("Error updating tutor connection status:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Tutor connection status updated successfully",
      });
    });

  } catch (error) {
    console.error("Error in UpdateTutorConnectionStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
/** Owner's tutor-need posts (live + expired) — by account id or email */
const getMyTutorNeeds = async (req, res) => {
  try {
    const userId = req.user?.id ? Number(req.user.id) : null;
    const email = String(req.user?.email || "").trim().toLowerCase();
    if (!userId && !email) {
      return res.status(401).json({
        success: false,
        message: "Login required to view your tutor requests",
      });
    }

    await ensureTutorNeedViewsTables();
    await ensureTutorConnectDefaults();

    const [rows] = await mysqlcon.promise().query(
      `SELECT * FROM tutors
       WHERE posted_by_user_id = ?
          OR (posted_by_user_id IS NULL AND LOWER(TRIM(email)) = ?)
          OR LOWER(TRIM(email)) = ?
       ORDER BY createdAt DESC`,
      [userId || 0, email || "", email || ""]
    );

    const ids = (rows || []).map((r) => r.id);
    let viewMap = {};
    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      const [viewRows] = await mysqlcon.promise().query(
        `SELECT tutor_id, view_type, COUNT(DISTINCT viewer_id) AS cnt
         FROM tutor_need_views
         WHERE tutor_id IN (${placeholders})
           AND viewer_id IS NOT NULL
         GROUP BY tutor_id, view_type`,
        ids
      );
      viewMap = (viewRows || []).reduce((acc, row) => {
        if (!acc[row.tutor_id]) {
          acc[row.tutor_id] = { listingViews: 0, contactViews: 0 };
        }
        if (row.view_type === "contact") {
          acc[row.tutor_id].contactViews = Number(row.cnt) || 0;
        } else {
          acc[row.tutor_id].listingViews = Number(row.cnt) || 0;
        }
        return acc;
      }, {});
    }

    const now = Date.now();
    const ttlMs = TUTOR_NEED_TTL_DAYS * 24 * 60 * 60 * 1000;
    const results = (rows || []).map((row) => {
      const created = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
      const ageOk = !Number.isNaN(created) && now - created <= ttlMs;
      const validFlag =
        row.isValid === true ||
        row.isValid === 1 ||
        row.isValid === "1" ||
        Number(row.isValid) === 1;
      const live = validFlag && ageOk;
      const expiresAt =
        !Number.isNaN(created) ? new Date(created + ttlMs).toISOString() : null;
      const views = viewMap[row.id] || { listingViews: 0, contactViews: 0 };
      return {
        ...row,
        listingStatus: live ? "live" : "expired",
        expiresAt,
        expiresInDays: TUTOR_NEED_TTL_DAYS,
        listingViews: views.listingViews,
        contactViews: views.contactViews,
      };
    });

    return res.json({
      success: true,
      results,
      liveCount: results.filter((r) => r.listingStatus === "live").length,
      expiredCount: results.filter((r) => r.listingStatus === "expired").length,
    });
  } catch (error) {
    console.error("Error fetching my tutor needs:", error);
    return res.status(500).json({
      success: false,
      error: "Database error",
    });
  }
};

/**
 * Record unique viewer for a tutor-need listing or contact reveal.
 * viewType: listing | contact
 */
const recordTutorNeedView = async (req, res) => {
  try {
    const tutorId = Number(req.params.tutorId);
    const viewerId = req.user?.id;
    const viewType =
      String(req.body?.viewType || req.query?.viewType || "listing").toLowerCase() ===
      "contact"
        ? "contact"
        : "listing";

    if (!tutorId || Number.isNaN(tutorId)) {
      return res.status(400).json({ success: false, message: "Invalid tutor id" });
    }
    if (!viewerId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    if (viewType === "contact") {
      const role = String(req.user?.role || "").toLowerCase();
      if (role !== "teacher" && role !== "professional") {
        return res.status(403).json({
          success: false,
          message: "Only teachers and professionals can view contact details",
        });
      }
    }

    await ensureTutorNeedViewsTables();

    // Unique per viewer+type — ignore duplicates
    await mysqlcon.promise().query(
      `INSERT IGNORE INTO tutor_need_views (tutor_id, viewer_id, view_type)
       VALUES (?, ?, ?)`,
      [tutorId, viewerId, viewType]
    );

    const [counts] = await mysqlcon.promise().query(
      `SELECT view_type, COUNT(DISTINCT viewer_id) AS cnt
       FROM tutor_need_views
       WHERE tutor_id = ? AND viewer_id IS NOT NULL
       GROUP BY view_type`,
      [tutorId]
    );
    const summary = { listingViews: 0, contactViews: 0 };
    (counts || []).forEach((row) => {
      if (row.view_type === "contact") summary.contactViews = Number(row.cnt) || 0;
      else summary.listingViews = Number(row.cnt) || 0;
    });

    // Optionally return contact when authorized reveal
    let contact = null;
    if (viewType === "contact") {
      const [tutorRows] = await mysqlcon.promise().query(
        `SELECT email, phone, name FROM tutors WHERE id = ? LIMIT 1`,
        [tutorId]
      );
      if (tutorRows?.[0]) {
        contact = {
          email: tutorRows[0].email,
          phone: tutorRows[0].phone,
          name: tutorRows[0].name,
        };
      }
    }

    return res.json({
      success: true,
      ...summary,
      contact,
    });
  } catch (error) {
    console.error("Error recording tutor need view:", error);
    return res.status(500).json({ success: false, error: "Database error" });
  }
};

module.exports = {
  registerTutor,
  getTutors,
  getMyTutorNeeds,
  recordTutorNeedView,
  updateTutor,
  deleteTutor,
  verifyTutorOTP,
  getTutorById,
  SendTutorConnect,
  CancelTutorRequest,
  AcceptTutorRequest,
  RejectTutorRequest,
  GetConnectionStatus,
};
