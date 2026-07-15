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

// Get all tutors
// const getTutors = (req, res) => {
//   const query = "SELECT * FROM tutors";
//   mysqlcon.query(query, (err, results) => {
//     if (err) {
//       console.error("Error fetching tutors:", err);
//       return res.status(500).json({ error: "Database error" });
//     }
//     res.json(results);
//   });
// };

const getTutors = async (req, res) => {
  try {
    let cacheKey = "tutor_list";
    let result = await cachedQuery({
      cacheName: 'lists',
      cacheKey: cacheKey,
      sql: 'SELECT * FROM tutors', // Fixed: 'slq' to 'sql'
      params: [], // Added: empty params array
      ttl: 3600 // Optional: Add TTL if needed
    });
    
    res.json(result.data);
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


const registerTutor = async (req, res) => {
  const { name, email, phone, subject, city, state, country, class: classList } = req.body;

  if (!name || !email || !phone || !subject || !city || !state || !classList) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if tutor already exists
    const slug = slugify(title, {
  lower: true,
  strict: true
}) + "-" + Date.now();
    const [existingTutor] = await mysqlcon
      .promise()
      .query("SELECT * FROM tutors WHERE email = ?", [email]);

    let tutorId;
    let isUpdate = false;

    // Convert subjects and classes to arrays for processing
    const subjectsArray = Array.isArray(subject) ? subject : [subject];
    const classesArray = Array.isArray(classList) ? classList : [classList];
    
    // Convert to comma-separated strings for database storage
    const subjectsString = subjectsArray.join(',');
    const classesString = classesArray.join(',');

    if (existingTutor.length > 0) {
      const tutor = existingTutor[0];
      isUpdate = true;
      tutorId = tutor.id;
      
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
        
        // Update the tutor record with new subjects and classes
        await mysqlcon.promise().query(
          `UPDATE tutors SET subject = ?, class = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [updatedSubjects, updatedClasses, tutor.id]
        );
        
        // ✅ Create question entry for updated tutor
        try {
          // Get user from users table if exists
          const [user] = await mysqlcon.promise().query(
            "SELECT * FROM users WHERE email = ?",
            [email]
          );
          
          // Prepare data for question
          const title = `Tutor Updated: ${name}`;
          const category = subjectsArray.join(', ');
          const body = `Tutor ${name} has updated their profile with new subjects: ${uniqueSubjects.join(', ')} and classes: ${uniqueClasses.join(', ')}`;
          const tagsJSON = JSON.stringify(classesArray);
          
          const userAvatar = user.length > 0 
            ? (user[0].avatar_url || 'https://static.vecteezy.com/system/resources/previews/034/784/595/original/little-buddha-cartoon-character-meditation-on-lotus-flower-vector.jpg')
            : 'https://static.vecteezy.com/system/resources/previews/034/784/595/original/little-buddha-cartoon-character-meditation-on-lotus-flower-vector.jpg';
          
          const userId = user.length > 0 ? user[0].id : null;
          
          // Insert into questions table
          
          await mysqlcon.promise().query(
            `INSERT INTO questions (user_id, img, title,slug, category, body, tags, is_answered, is_hidden, brief, notification, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              userAvatar,
              title,
              slug,
              category,
              body,
              tagsJSON,
              '0',  // is_answered as '0' (not answered)
              0,    // is_hidden as 0 (visible)
              `Updated tutor profile for ${name} - Now teaching ${subjectsArray.join(', ')} for ${classesArray.join(', ')} classes`,
              'tutor_update',
              'system'
            ]
          );
          
          console.log(`Question entry created for updated tutor ID: ${tutorId}`);
        } catch (questionError) {
          console.error("Error creating question entry for update:", questionError);
        }
        
        return res.json({
          success: true,
          message: "Tutor profile updated with new subjects and/or classes.",
          tutorId,
          addedSubjects: uniqueSubjects,
          addedClasses: uniqueClasses
        });
      } else {
        // No new subjects or classes to add
        return res.status(400).json({ 
          error: "Tutor already registered with the same subjects and classes" 
        });
      }
    }

    // ✅ Check if user exists and active
    const [existingUser] = await mysqlcon
      .promise()
      .query("SELECT * FROM users WHERE email = ? AND status = 'active'", [email]);

    if (existingUser.length > 0) {
      // ✅ If user is active, register tutor as already valid (no OTP needed)
      const [result] = await mysqlcon.promise().query(
        `INSERT INTO tutors (name, email, phone, subject, class, city, state, country, isValid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name, 
          email, 
          phone, 
          subjectsString, 
          classesString, 
          city, 
          state, 
          country || "India", 
          true
        ]
      );

      tutorId = result.insertId;

      // ✅ Create entry in questions table for new tutor registration
      try {
        // Prepare data for question
        const title = `New Tutor Searching: ${name}`;
        const category = subjectsArray.join(', ');
        const body = `New tutor ${name} is searching for opportunities. They teach ${subjectsArray.join(', ')} for ${classesArray.join(', ')} classes in ${city}, ${state}`;
        const tagsJSON = JSON.stringify(classesArray);
        
        const userAvatar = existingUser[0].avatar_url || 'https://static.vecteezy.com/system/resources/previews/034/784/595/original/little-buddha-cartoon-character-meditation-on-lotus-flower-vector.jpg';
        
        // Insert into questions table
        await mysqlcon.promise().query(
          `INSERT INTO questions (user_id, img, title, slug,category, body, tags, is_answered, is_hidden, brief, notification, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            existingUser[0].id,
            userAvatar,
            title,
            slug,
            category,
            body,
            tagsJSON,
            '0',  // is_answered as '0' (not answered)
            0,    // is_hidden as 0 (visible)
            `New tutor registration for ${name} - Teaching ${subjectsArray.join(', ')} for ${classesArray.join(', ')} classes`,
            'tutor_registration',
            'system'
          ]
        );
        
        console.log(`Question entry created for new tutor ID: ${tutorId}, user ID: ${existingUser[0].id}`);
      } catch (questionError) {
        console.error("Error creating question entry for new tutor:", questionError);
      }

      return res.json({
        success: true,
        message: "Tutor registered successfully (User already active).",
        tutorId,
      });
    }

    // ❌ New user (not in users table or not active) → OTP flow required
    const [result] = await mysqlcon.promise().query(
      `INSERT INTO tutors (name, email, phone, subject, class, city, state, country, isValid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, 
        email, 
        phone, 
        subjectsString, 
        classesString, 
        city, 
        state, 
        country || "India", 
        false
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
    });
  } catch (err) {
    console.error("Register Tutor Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
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

    res.json({
      success: true,
      message: "Tutor verified and activated successfully",
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update a tutor by ID
const updateTutor = (req, res) => {
  const { id } = req.params;
  const { name, email, phone, subject, city, state, country, isValid } =
    req.body;

  if (!id) return res.status(400).json({ error: "Tutor ID is required" });

  const query = `
    UPDATE tutors
    SET 
      name='${name}',
      email='${email}',
      phone='${phone}',
      subject='${subject}',
      city='${city}',
      state='${state}',
      country='${country || "India"}',
      isValid=${isValid},
      updatedAt=NOW()
    WHERE id=${id}
  `;

  mysqlcon.query(query, (err, result) => {
    if (err) {
      console.error("Error updating tutor:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tutor not found" });
    }
    res.json({ message: "Tutor updated successfully" });
  });
};

// Delete a tutor by ID
const deleteTutor = (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: "Tutor ID is required" });

  const query = `DELETE FROM tutors WHERE id=${id}`;

  mysqlcon.query(query, (err, result) => {
    if (err) {
      console.error("Error deleting tutor:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tutor not found" });
    }
    res.json({ message: "Tutor deleted successfully" });
  });
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
    const {
      receiverEmail,
      subject,
      senderName,
      receiverName,
      senderEmail,
      senderUserId,
      frontendUrl,
    } = req.body;

    const tutorId = req.params.tutorId;

    // Validate tutorId
    if (!tutorId || isNaN(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tutor ID",
      });
    }

    // Check if tutor exists - SECURE QUERY
    const checkTutorQuery = "SELECT id, email, connectionStatus FROM tutors WHERE id = ?";
    mysqlcon.query(checkTutorQuery, [parseInt(tutorId)], async (err, tutorResult) => {
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

      // Check if tutor already has a pending or completed connection
      if (tutor.connectionStatus === 'pending') {
        return res.status(400).json({
          success: false,
          message: "Tutor already has a pending connection request",
        });
      }

      if (tutor.connectionStatus === 'completed') {
        return res.status(400).json({
          success: false,
          message: "Tutor is already connected with someone",
        });
      }

      // Send email using the service
      let emailSent = await sendTutorConnectRequest(
        receiverEmail,
        subject,
        senderName,
        receiverName,
        senderEmail,
        senderUserId,
        frontendUrl || 'https://www.eksathi.com/'
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send email",
        });
      }

      // Update tutor's connection status to 'pending' - SECURE QUERY
      const updateTutorQuery = 'UPDATE tutors SET connectionStatus = ? WHERE id = ?';
      mysqlcon.query(updateTutorQuery, ['pending', parseInt(tutorId)], (err, updateResult) => {
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
          message: "Connection request sent successfully",
        });
      });
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
    const { userId } = req.body;
    const tutorId = req.params.tutorId;

    // Validate IDs
    if (!userId || isNaN(userId) || !tutorId || isNaN(tutorId)) {
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
    const { userId } = req.body;
    const tutorId = req.params.tutorId;

    // Validate IDs
    if (!userId || isNaN(userId) || !tutorId || isNaN(tutorId)) {
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
    const { userId } = req.body;
    const tutorId = req.params.tutorId;

    // Validate IDs
    if (!userId || isNaN(userId) || !tutorId || isNaN(tutorId)) {
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
module.exports = {
  registerTutor,
  getTutors,
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
