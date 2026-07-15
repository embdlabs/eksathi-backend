const {
  checkHashedPass,
  hashingPassword,
  instituteLoginSchema,
  InstituteRegisterSchema,
} = require("../utils/validation");
const {
  createUsernameForUser,
  generateOTP,
} = require("../service/auth.service");
const {
  checkUserByEmail,
  updateUserActivities,
} = require("../service/utilities.service");
const { createJWT } = require("../service/auth.service");
const { mysqlcon } = require("../model/db");
const jwt = require("jsonwebtoken");
const messages = require("../models/messages");
const { DBMODELS } = require("../models/init-models");
const { Op, where, fn, col } = require("sequelize");
const moment = require("moment/moment");
const { sendTemplatedEmail, sendWelcomeMail } = require("../utils/email");

// const signup = async (req, res) => {
//   try {
//     let {
//       password,
//       email,
//       first_name,
//       last_name,
//       contact,
//       role,
//       profession,
//       skill,
//       education,
//       displayName,
//       dob,
//       gender,
//       address,
//       classname,
//       school,
//       board,
//       twitter,
//       facebook,
//       instagram,
//       youtube,
//       github,
//       linkedin,
//       bio,
//       subject,
//       teaching_method,
//       nearestLocation,
//     } = req.body;

//     // console.log("UserDetails : ", req.body)
//     let middle_name = req.body.middle_name;

//     if (!first_name || !email || !contact || !password) {
//       return res
//         .status(400)
//         .json({ message: "Name,Contact, Email or Password is missing" });
//     }

//     const userAlreadyExist = await DBMODELS.users.findOne({
//       where: {
//         [Op.or]: [{ email: email }, { phone: contact }],
//       },
//     });

//     if (userAlreadyExist) {
//       // console.log("userAlreadyExist", userAlreadyExist);
//       return res.status(409).json({ message: "User already Registered" });
//     }
//     const username = createUsernameForUser();
//     let hashpassword = await hashingPassword(password);

//     const userData = {
//       username: username,
//       password: hashpassword,
//       email: email,
//       first_name: first_name,
//       middle_name: middle_name,
//       last_name: last_name,
//       phone: contact,
//       role: profession,
//       // profession: profession,
//       display_name: displayName,
//       location: address,
//       bio: bio,
//       subject: subject,
//       teaching_method: teaching_method,
//       nearestLocation: nearestLocation,
//     };

//     const teacherData = {
//       name: first_name + last_name,
//       subject: subject,

//       class: classname,
//       city: address.city,
//       state: address.city,
//       contact_info: email,
//     };

//     if (profession === "teacher" || role === "teacher") {
//       await DBMODELS.teacher.create(teacherData);
//     }

//     const userCreate = await DBMODELS.users.create(userData);

//     const locationData = {
//       user_id: userCreate.id,
//       city_name: address.city,
//       district: address.country,
//       state_name: address.state,
//       area: nearestLocation,
//     };

//     const userProfileData = {
//       user_id: userCreate.id,
//       first_name: first_name,
//       middle_name: middle_name,
//       last_name: last_name,
//       profession: profession,
//       dob: dob,
//       gender: gender,
//       location: address,
//       selectedSubjects: subject,
//       classLevel: classname,
//       twitter_link: twitter,
//       facebook_link: facebook,
//       instagram_link: instagram,
//       youtube_link: youtube,
//       github_link: github,
//       linkedin_link: linkedin,
//       bio: bio,
//       school: school,
//       board: board,
//     };

//     const user = await DBMODELS.user_profiles.create(userProfileData);

//     const locationCreate = await DBMODELS.locations.create(locationData);
//     // console.log("Location is created successfully", locationCreate);

//     const expiry = 10;
//     if (user) {
//       let clientotp = generateOTP();
//       // console.log("otp1 :", clientotp);
//       otp = await hashingPassword(clientotp);
//       const expiryTime = new Date(moment().add(expiry, "minute"));
//       await DBMODELS.otp.create({
//         user_id: userCreate.id,
//         code: clientotp,
//         expired_at: expiryTime,
//       });

//       const jwtToken = await createJWT({
//         id: userCreate.id,
//         email,
//         role,
//         clientotp,
//       });
//       // Send OTP to user's email
//       const replacements = {
//         name: first_name + " " + last_name,
//         otpCode: clientotp,
//         loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
//         expirationTime: "10 Minutes",
//       };
//       let mailConfig = {
//         email: email,
//         subject: `Your Verification OTP is ${clientotp}`,
//       };
//       sendTemplatedEmail(mailConfig, replacements, "SEND_OTP");
//     }

//     return res
//       .status(201)
//       .json({ userCreate, expiry, message: "User SignUp Successfully" });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Error during signUp" });
//   }

//   // const validation = await InstituteRegisterSchema.validate(req.body);
//   // //validation error
//   // if (validation.error)
//   //   console.log("This Error")
//   //   return res.status(403).json({
//   //     message: validation.error.message,
//   //   });
//   //validation is ok

//   let bioTemplate;
//   switch (role) {
//     case "teacher":
//       bioTemplate = `Hello! My name is ${first_name} ${last_name}, and I am thrilled to introduce myself as a teacher at [School Name]. I am passionate about education and committed to making a positive impact on the lives of my students. With [number of years] of experience in teaching ${skill}, I strive to create a supportive and engaging learning environment where students can thrive.`;
//       break;
//     case "professional":
//       bioTemplate = `
//             I am ${first_name} ${last_name}, a dedicated and versatile professional with expertise in [mention relevant field/industry]. With a strong background in [mention key qualifications], I am known for my ${skill}. I am committed to delivering exceptional results, fostering teamwork, and continuously expanding my knowledge to stay ahead in my field`;
//       break;
//     case "student":
//       bioTemplate = `Hello! My name is ${first_name} ${last_name}, and I am excited to share a little bit about myself. I am currently in [Grade/Year] at [School Name]. I believe that education is a journey of self-discovery and growth, and I am eager to make the most of my time as a student.`;
//       break;
//     default:
//       bioTemplate = "";
//       break;
//   }

//   try {
//     mysqlcon.query(
//       `SELECT id, email FROM users WHERE email='${email}' OR phone=${contact}`,
//       async (err, result) => {
//         if (err) {
//           console.log(err);
//           return res.status(500).json({ message: "Internal Server Error" });
//         }

//         if (result.length) {
//           return res.status(409).json({ message: "Already Registered" });
//         } else {
//           //Generate Username
//           const username = createUsernameForUser();

//           // insert the new institute into the main database
//           let hashpassword = await hashingPassword(password);
//           mysqlcon.query(
//             "INSERT INTO users (username, password, email, first_name, middle_name, last_name, phone, role, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
//             [
//               username,
//               hashpassword,
//               email,
//               first_name,
//               middle_name,
//               last_name,
//               contact,
//               role,
//               bio || bioTemplate,
//             ],
//             async (error, results, fields) => {
//               if (error) {
//                 console.error(error);
//                 res.status(500).json({ message: "Error signing up user" });
//               } else {
//                 // console.log({ results, fields });
//                 let userId = results.insertId;
//                 if (skill) {
//                   mysqlcon.query(
//                     `INSERT INTO skills (user_id, skill_name, proficiency_level) VALUES (?, ?, 'Expert')`,
//                     [userId, skill],
//                     async (err) => {
//                       if (err) {
//                         console.log(err);
//                         return res
//                           .status(500)
//                           .json({ message: "Internal Server Error" });
//                       }
//                       mysqlcon.query(
//                         `INSERT INTO user_profiles (first_name, middle_name, last_name, profession, education, bio, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
//                         [
//                           first_name,
//                           middle_name,
//                           last_name,
//                           profession,
//                           education,
//                           bio || bioTemplate,
//                           userId,
//                         ],
//                         async (err) => {
//                           if (err) {
//                             console.log(err);
//                             return res
//                               .status(500)
//                               .json({ message: err.message });
//                           }
//                           let clientotp = generateOTP();
//                           // console.log("otp1 :", clientotp);
//                           otp = await hashingPassword(clientotp);
//                           // Set the expiry time for the OTP (in minutes)
//                           const expiry = 10; // The OTP will expire in 10 minutes
//                           mysqlcon.query(
//                             `INSERT INTO otp (user_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
//                             [userId, clientotp, expiry],
//                             async function (err, result) {
//                               if (err) {
//                                 console.log(err);
//                                 res
//                                   .status(500)
//                                   .json({ message: "Internal Server Error" });
//                               } else {
//                                 const jwtToken = await createJWT({
//                                   id: userId,
//                                   email,
//                                   role,
//                                   clientotp,
//                                 });
//                                 // Send OTP to user's email
//                                 const replacements = {
//                                   name: first_name + " " + last_name,
//                                   otpCode: clientotp,
//                                   loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
//                                   expirationTime: "10 Minutes",
//                                 };
//                                 let mailConfig = {
//                                   email: email,
//                                   subject: `Your Verification OTP is ${clientotp}`,
//                                 };
//                                 sendTemplatedEmail(
//                                   mailConfig,
//                                   replacements,
//                                   "SEND_OTP"
//                                 );
//                                 // res.status(200).json({
//                                 //   message: "Verify your account",
//                                 //   desc: "Check your email address for the otp",
//                                 //   userId: userId,
//                                 // });
//                               }
//                             }
//                           );
//                         }
//                       );
//                     }
//                   );
//                 } else {
//                   mysqlcon.query(
//                     `INSERT INTO user_profiles (first_name, middle_name, last_name, profession, education, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
//                     [
//                       first_name,
//                       middle_name,
//                       last_name,
//                       profession,
//                       education,
//                       userId,
//                     ],
//                     async (err) => {
//                       if (err) {
//                         console.log(err);
//                         return res.status(500).json({ message: err.message });
//                       }
//                       console.log("User sign up Successfully!");
//                       let clientotp = generateOTP();
//                       console.log("otp2 :", clientotp);
//                       otp = await hashingPassword(clientotp);
//                       // Set the expiry time for the OTP (in minutes)
//                       const expiry = 10; // The OTP will expire in 10 minutes
//                       mysqlcon.query(
//                         `INSERT INTO otp (user_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
//                         [userId, clientotp, expiry],
//                         async function (err, result) {
//                           if (err) {
//                             console.log(err);
//                             res
//                               .status(500)
//                               .json({ message: "Internal Server Error" });
//                           } else {
//                             const jwtToken = await createJWT({
//                               id: userId,
//                               email,
//                               role,
//                               clientotp,
//                             });
//                             // Send OTP to user's email
//                             const replacements = {
//                               name: first_name + " " + last_name,
//                               otpCode: clientotp,
//                               loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
//                               expirationTime: "10 Minutes",
//                             };
//                             let mailConfig = {
//                               email: email,
//                               subject: `Your Verification OTP is ${clientotp}`,
//                             };
//                             sendTemplatedEmail(
//                               mailConfig,
//                               replacements,
//                               "SEND_OTP"
//                             );
//                             // res.status(200).json({
//                             //   message: "Verify your account",
//                             //   desc: "Check your email address for the otp",
//                             //   userId: userId,
//                             // });

//                             // return;
//                           }
//                         }
//                       );
//                     }
//                   );
//                 }
//                 res.status(200).json({
//                   message: "User signed up successfully!",
//                   results,
//                   fields,
//                 });
//               }
//             }
//           );
//         }
//       }
//     );
//   } catch (error) {
//     console.log(err);
//     res.status(409).json({ message: "Something went worng" });
//   }
// };

const normalizeSignupEmail = (email) =>
  email ? String(email).trim().toLowerCase() : email;

const normalizeSignupPhone = (phone) => {
  if (phone == null || phone === "") return null;
  const digits = String(phone).replace(/\D/g, "");
  return digits || String(phone).trim();
};

// Role users (student / teacher / professional) share one master `users` record.
// Institutes, admins, and guests are separate account namespaces and may reuse
// the same email or phone without blocking role-user signup.
const findRoleUserConflict = async (email, contact) => {
  const normalizedEmail = email ? normalizeSignupEmail(email) : null;
  const normalizedPhone =
    contact != null && contact !== "" ? normalizeSignupPhone(contact) : null;
  const phoneCandidates =
    contact != null && contact !== ""
      ? [contact, normalizedPhone].filter(
          (value, index, list) =>
            value != null && value !== "" && list.indexOf(value) === index
        )
      : [];

  const identityConditions = [];
  if (normalizedEmail) {
    identityConditions.push(
      where(fn("LOWER", col("email")), normalizedEmail)
    );
  }
  phoneCandidates.forEach((phone) => identityConditions.push({ phone }));

  if (identityConditions.length === 0) {
    return null;
  }

  const existingUser = await DBMODELS.users.findOne({
    where: { [Op.or]: identityConditions },
  });

  if (existingUser) {
    return {
      source: "users",
      message: "User already Registered",
    };
  }

  return null;
};

const upsertTeacherProfile = async (email, teacherData) => {
  const existingTeacher = await DBMODELS.teacher.findOne({
    where: { contact_info: email },
  });

  if (existingTeacher) {
    await existingTeacher.update(teacherData);
    return existingTeacher;
  }

  return DBMODELS.teacher.create(teacherData);
};

const signup = async (req, res) => {
  try {
    let {
      password,
      email,
      first_name,
      last_name,
      contact,
      role,
      profession,
      skill,
      education,
      displayName,
      dob,
      gender,
      address,
      classname,
      school,
      board,
      twitter,
      facebook,
      instagram,
      youtube,
      github,
      linkedin,
      bio,
      subject,
      teaching_method,
      nearestLocation,
    } = req.body;

    // console.log("UserDetails : ", req.body)
    let middle_name = req.body.middle_name;

    if (!first_name || !email || !contact || !password) {
      return res
        .status(400)
        .json({ message: "Name,Contact, Email or Password is missing" });
    }

    email = normalizeSignupEmail(email);
    contact = normalizeSignupPhone(contact);

    const accountConflict = await findRoleUserConflict(email, contact);
    if (accountConflict) {
      return res.status(409).json({
        success: false,
        message: accountConflict.message,
      });
    }
    const username = createUsernameForUser();
    let hashpassword = await hashingPassword(password);

    const userData = {
      username: username,
      password: hashpassword,
      email: email,
      first_name: first_name,
      middle_name: middle_name,
      last_name: last_name,
      phone: contact,
      role: profession,
      display_name: displayName,
      location: address,
      bio: bio,
    };

    if (subject && (Array.isArray(subject) ? subject.length : subject)) {
      userData.subject = subject;
    }
    if (["online", "offline", "both"].includes(teaching_method)) {
      userData.teaching_method = teaching_method;
    }
    if (nearestLocation) {
      userData.nearestLocation = nearestLocation;
    }

    const teacherData = {
      name: first_name + last_name,
      subject: subject || [],
      class: classname || "N/A",
      city: address?.city || "N/A",
      state: address?.state || "N/A",
      contact_info: email,
    };

    const userCreate = await DBMODELS.users.create(userData);

    if (profession === "teacher" || role === "teacher") {
      await upsertTeacherProfile(email, teacherData);
    }

    const locationData = {
      user_id: userCreate.id,
      city_name: address?.city || "",
      district: address?.country || "IN",
      state_name: address?.state || "",
      area: nearestLocation || "",
    };

    const userProfileData = {
      user_id: userCreate.id,
      first_name: first_name,
      middle_name: middle_name,
      last_name: last_name,
      profession: profession,
      location: address,
      bio: bio,
    };

    if (dob) userProfileData.dob = dob;
    if (gender) userProfileData.gender = gender;
    if (subject && (Array.isArray(subject) ? subject.length : subject)) {
      userProfileData.selectedSubjects = subject;
    }
    if (classname) userProfileData.classLevel = classname;
    if (twitter) userProfileData.twitter_link = twitter;
    if (facebook) userProfileData.facebook_link = facebook;
    if (instagram) userProfileData.instagram_link = instagram;
    if (youtube) userProfileData.youtube_link = youtube;
    if (github) userProfileData.github_link = github;
    if (linkedin) userProfileData.linkedin_link = linkedin;
    if (school) userProfileData.school = school;
    if (board) userProfileData.board = board;

    const user = await DBMODELS.user_profiles.create(userProfileData);

    const locationCreate = await DBMODELS.locations.create(locationData);
    // console.log("Location is created successfully", locationCreate);

    // CREATE QUESTION RECORD AFTER SUCCESSFUL REGISTRATION
    const questionTitle = `Welcome ${first_name} ${last_name} - New User Introduction`;
    const questionSlug = `welcome-${username.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
    const questionBody = `Hello! I am ${first_name} ${last_name}, a new member joining the community. I'm excited to connect with everyone!`;
    const questionBrief = `Introduction post for new user ${first_name} ${last_name} who just registered as a ${profession}.`;
    
    // Prepare tags for the question
    const questionTags = {
      user_id: userCreate.id,
      username: username,
      profession: profession,
      registration_type: 'new_user',
      introduction: 'welcome'
    };

    // Create question record
    try {
      const questionData = {
        title: questionTitle,
        slug: questionSlug,
        tags: questionTags,
        category_id: 1, // You may want to set a default category ID or pass it from request
        body: questionBody,
        isPost: 1, // Set isPost to 1 as required
        img: null,
        notification: 'new_user_registration',
        is_answered: 'open',
        user_id: userCreate.id,
        is_hidden: 0,
        brief: questionBrief,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await DBMODELS.questions.create(questionData);
      console.log("Question created successfully for new user:", userCreate.id);
    } catch (questionError) {
      console.log("Error creating question record:", questionError);
      // Don't fail the registration if question creation fails
      // Continue with the registration process
    }

    const expiry = 10;
    if (user) {
      let clientotp = generateOTP();
      // console.log("otp1 :", clientotp);
      otp = await hashingPassword(clientotp);
      const expiryTime = new Date(moment().add(expiry, "minute"));
      await DBMODELS.otp.create({
        user_id: userCreate.id,
        code: clientotp,
        expired_at: expiryTime,
      });

      const jwtToken = await createJWT({
        id: userCreate.id,
        email,
        role,
        clientotp,
      });
      // Send OTP to user's email
      const replacements = {
        name: first_name + " " + last_name,
        otpCode: clientotp,
        loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
        expirationTime: "10 Minutes",
      };
      let mailConfig = {
        email: email,
        subject: `Your Verification OTP is ${clientotp}`,
      };
      sendTemplatedEmail(mailConfig, replacements, "SEND_OTP");
    }

    return res
      .status(201)
      .json({ userCreate, expiry, message: "User SignUp Successfully" });
  } catch (error) {
    console.error("Signup Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A user account with this email or phone already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }

  // The following code appears to be duplicated/old code that should be removed
  // But I'm keeping it as per your request not to change other code
  // const validation = await InstituteRegisterSchema.validate(req.body);
  // //validation error
  // if (validation.error)
  //   console.log("This Error")
  //   return res.status(403).json({
  //     message: validation.error.message,
  //   });
  //validation is ok

  let bioTemplate;
  switch (role) {
    case "teacher":
      bioTemplate = `Hello! My name is ${first_name} ${last_name}, and I am thrilled to introduce myself as a teacher at [School Name]. I am passionate about education and committed to making a positive impact on the lives of my students. With [number of years] of experience in teaching ${skill}, I strive to create a supportive and engaging learning environment where students can thrive.`;
      break;
    case "professional":
      bioTemplate = `
            I am ${first_name} ${last_name}, a dedicated and versatile professional with expertise in [mention relevant field/industry]. With a strong background in [mention key qualifications], I am known for my ${skill}. I am committed to delivering exceptional results, fostering teamwork, and continuously expanding my knowledge to stay ahead in my field`;
      break;
    case "student":
      bioTemplate = `Hello! My name is ${first_name} ${last_name}, and I am excited to share a little bit about myself. I am currently in [Grade/Year] at [School Name]. I believe that education is a journey of self-discovery and growth, and I am eager to make the most of my time as a student.`;
      break;
    default:
      bioTemplate = "";
      break;
  }

  try {
    mysqlcon.query(
      `SELECT id, email FROM users WHERE email='${email}' OR phone=${contact}`,
      async (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (result.length) {
          return res.status(409).json({ message: "Already Registered" });
        } else {
          //Generate Username
          const username = createUsernameForUser();

          // insert the new institute into the main database
          let hashpassword = await hashingPassword(password);
          mysqlcon.query(
            "INSERT INTO users (username, password, email, first_name, middle_name, last_name, phone, role, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
            [
              username,
              hashpassword,
              email,
              first_name,
              middle_name,
              last_name,
              contact,
              role,
              bio || bioTemplate,
            ],
            async (error, results, fields) => {
              if (error) {
                console.error(error);
                res.status(500).json({ message: "Error signing up user" });
              } else {
                // console.log({ results, fields });
                let userId = results.insertId;
                
                // CREATE QUESTION RECORD FOR MYSQL QUERY PATH
                const questionTitle = `Welcome ${first_name} ${last_name} - New User Introduction`;
                const questionSlug = `welcome-${username.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
                const questionBody = `Hello! I am ${first_name} ${last_name}, a new member joining the community. I'm excited to connect with everyone!`;
                const questionBrief = `Introduction post for new user ${first_name} ${last_name} who just registered as a ${profession}.`;
                
                // Prepare tags for the question
                const questionTags = JSON.stringify({
                  user_id: userId,
                  username: username,
                  profession: profession,
                  registration_type: 'new_user',
                  introduction: 'welcome'
                });

                // Insert question record
                mysqlcon.query(
                  `INSERT INTO questions (
                    title, slug, tags, category_id, body, isPost, img, 
                    notification, is_answered, user_id, is_hidden, brief, createdAt, updatedAt
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    questionTitle,
                    questionSlug,
                    questionTags,
                    1, // category_id
                    questionBody,
                    1, // isPost = 1
                    null, // img
                    'new_user_registration', // notification
                    'open', // is_answered
                    userId, // user_id
                    0, // is_hidden
                    questionBrief,
                    new Date(), // createdAt
                    new Date()  // updatedAt
                  ],
                  (questionErr) => {
                    if (questionErr) {
                      console.log("Error creating question record:", questionErr);
                      // Continue with registration even if question creation fails
                    } else {
                      console.log("Question created successfully for user:", userId);
                    }
                  }
                );
                
                if (skill) {
                  mysqlcon.query(
                    `INSERT INTO skills (user_id, skill_name, proficiency_level) VALUES (?, ?, 'Expert')`,
                    [userId, skill],
                    async (err) => {
                      if (err) {
                        console.log(err);
                        return res
                          .status(500)
                          .json({ message: "Internal Server Error" });
                      }
                      mysqlcon.query(
                        `INSERT INTO user_profiles (first_name, middle_name, last_name, profession, education, bio, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                          first_name,
                          middle_name,
                          last_name,
                          profession,
                          education,
                          bio || bioTemplate,
                          userId,
                        ],
                        async (err) => {
                          if (err) {
                            console.log(err);
                            return res
                              .status(500)
                              .json({ message: err.message });
                          }
                          let clientotp = generateOTP();
                          // console.log("otp1 :", clientotp);
                          otp = await hashingPassword(clientotp);
                          // Set the expiry time for the OTP (in minutes)
                          const expiry = 10; // The OTP will expire in 10 minutes
                          mysqlcon.query(
                            `INSERT INTO otp (user_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
                            [userId, clientotp, expiry],
                            async function (err, result) {
                              if (err) {
                                console.log(err);
                                res
                                  .status(500)
                                  .json({ message: "Internal Server Error" });
                              } else {
                                const jwtToken = await createJWT({
                                  id: userId,
                                  email,
                                  role,
                                  clientotp,
                                });
                                // Send OTP to user's email
                                const replacements = {
                                  name: first_name + " " + last_name,
                                  otpCode: clientotp,
                                  loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
                                  expirationTime: "10 Minutes",
                                };
                                let mailConfig = {
                                  email: email,
                                  subject: `Your Verification OTP is ${clientotp}`,
                                };
                                sendTemplatedEmail(
                                  mailConfig,
                                  replacements,
                                  "SEND_OTP"
                                );
                                // res.status(200).json({
                                //   message: "Verify your account",
                                //   desc: "Check your email address for the otp",
                                //   userId: userId,
                                // });
                              }
                            }
                          );
                        }
                      );
                    }
                  );
                } else {
                  mysqlcon.query(
                    `INSERT INTO user_profiles (first_name, middle_name, last_name, profession, education, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      first_name,
                      middle_name,
                      last_name,
                      profession,
                      education,
                      userId,
                    ],
                    async (err) => {
                      if (err) {
                        console.log(err);
                        return res.status(500).json({ message: err.message });
                      }
                      console.log("User sign up Successfully!");
                      let clientotp = generateOTP();
                      console.log("otp2 :", clientotp);
                      otp = await hashingPassword(clientotp);
                      // Set the expiry time for the OTP (in minutes)
                      const expiry = 10; // The OTP will expire in 10 minutes
                      mysqlcon.query(
                        `INSERT INTO otp (user_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
                        [userId, clientotp, expiry],
                        async function (err, result) {
                          if (err) {
                            console.log(err);
                            res
                              .status(500)
                              .json({ message: "Internal Server Error" });
                          } else {
                            const jwtToken = await createJWT({
                              id: userId,
                              email,
                              role,
                              clientotp,
                            });
                            // Send OTP to user's email
                            const replacements = {
                              name: first_name + " " + last_name,
                              otpCode: clientotp,
                              loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
                              expirationTime: "10 Minutes",
                            };
                            let mailConfig = {
                              email: email,
                              subject: `Your Verification OTP is ${clientotp}`,
                            };
                            sendTemplatedEmail(
                              mailConfig,
                              replacements,
                              "SEND_OTP"
                            );
                            // res.status(200).json({
                            //   message: "Verify your account",
                            //   desc: "Check your email address for the otp",
                            //   userId: userId,
                            // });

                            // return;
                          }
                        }
                      );
                    }
                  );
                }
                res.status(200).json({
                  message: "User signed up successfully!",
                  results,
                  fields,
                });
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.log(err);
    res.status(409).json({ message: "Something went worng" });
  }
};

const emailAlreadyExist = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const accountConflict = await findRoleUserConflict(
      normalizeSignupEmail(email),
      null
    );

    if (accountConflict) {
      return res
        .status(200)
        .json({ exists: true, message: "Email already exists" });
    }

    return res
      .status(201)
      .json({ exists: false, message: "Email is available" });
  } catch (error) {
    console.error("Error checking email existence:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const emailOrPhoneAlreadyExist = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or Phone is required" });
    }

    const accountConflict = await findRoleUserConflict(
      email ? normalizeSignupEmail(email) : null,
      phone ? normalizeSignupPhone(phone) : null
    );

    if (accountConflict) {
      return res.status(200).json({
        exists: true,
        message: "Email or Phone already exists",
      });
    }

    return res.status(201).json({
      exists: false,
      message: "Email/Phone is available",
    });
  } catch (error) {
    console.error("Error checking email/phone existence:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const additionalInfo = async (req, res) => {
  const userId = req.query.userId;
  const addiInfo = req.body;

  // Extract relevant data for each table
  const locationData = {
    userId,
    area: addiInfo.area,
    city: addiInfo.city,
    district: addiInfo.district,
    state: addiInfo.state,
    pincode: addiInfo.pincode,
  };

  const skillsData = {
    userId,
    skill: addiInfo.selectedExpertise,
  };

  const userProfileData = {
    userId,
    classLevel: addiInfo.classLevel,
    selectedSubjects: addiInfo.selectedSubjects,
    teachingClasses: addiInfo.teachingClasses,
    teachAllSubjects: addiInfo.teachAllSubjects,
    gender: addiInfo.gender,
    dateOfBirth: addiInfo.dateOfBirth,
  };

  // console.log("locationData", locationData);
  // console.log("skillsData", skillsData);
  // console.log("userProfileData", userProfileData);
  // Save data in respective tables
  try {
    // Location table
    const locationQuery = `
      INSERT INTO locations (user_id, area, city_name, district, state_name, pincode)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    mysqlcon.query(locationQuery, [
      locationData.userId,
      locationData.area,
      locationData.city,
      locationData.district,
      locationData.state,
      locationData.pincode,
    ]);

    // Skills table
    const skillsQuery = `
      INSERT INTO skills (user_id, skill_name, proficiency_level)
      VALUES (?, ?, 'Expert')
    `;
    mysqlcon.query(skillsQuery, [
      skillsData.userId,
      JSON.stringify(skillsData.skill),
    ]);

    // User profile table
    const userProfileQuery = `
      UPDATE user_profiles
      SET classLevel = ?, selectedSubjects = ?, teachingClasses = ?, teachAllSubjects = ?, gender = ?, dob = ?
      WHERE user_id = ?
    `;
    mysqlcon.query(userProfileQuery, [
      userProfileData.classLevel,
      JSON.stringify(userProfileData.selectedSubjects),
      JSON.stringify(userProfileData.teachingClasses),
      userProfileData.teachAllSubjects,
      userProfileData.gender,
      userProfileData.dateOfBirth,
      userProfileData.userId,
    ]);

    res.status(201).send({ message: "Data saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error saving data" });
  }
};


// const signin = async (req, res) => {

//   const { username, email, phone, password } = req.body;
//   console.log(req.body);
//   let identifier;
//   if (!username && !email && !phone) {
//     return res.status(404).json({
//       message: "Must provide anyone of Username, Email and Phone Number",
//     });
//   }
//   if (!password)
//     return res
//       .status(404)
//       .json({ message: "Identifier or Password is not Provided" });
//   const validation = await instituteLoginSchema.validate(req.body);
//   //validation error
//   if (validation.error)
//     return res.status(403).json({
//       message: validation.error.message,
//     });
//   //validation is ok
//   let IdentifierType;
//   if (username) {
//     identifier = username;
//     IdentifierType = typeof validation.value.username;
//   } else if (email) {
//     identifier = email;
//     IdentifierType = typeof validation.value.email;
//   } else if (phone) {
//     identifier = phone;
//     IdentifierType = typeof validation.value.phone;
//   } else {
//     res.status(400).json({ message: "Something went wrong" });
//   }
//   try {
//     mysqlcon.query(
//       `SELECT id, avatar_url as profile, first_name, last_name, email, phone, password, role, status FROM users WHERE ${
//         username
//           ? `username='${username}'`
//           : email
//           ? `email='${email}'`
//           : phone
//           ? `phone=${phone}`
//           : ""
//       }`,
//       async function (err, result) {
//         if (err) {
//           console.log("Database Error:", err);
//           res.status(500).json({ message: "Internal Server Error" });
//         } else if (result.length == 0) {
//           return res
//             .status(404)
//             .json({ message: "Incorrect credentials combination", error: err });
//         } else if (result[0].status == "inactive") {
//           const user = result[0];

//           let clientotp = generateOTP();
//           otp = await hashingPassword(clientotp);
//           // Set the expiry time for the OTP (in minutes)
//           const expiry = 10; // The OTP will expire in 10 minutes
//           mysqlcon.query(
//             `INSERT INTO otp (user_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
//             [user.id, clientotp, expiry],
//             async function (err, otpResult, fields) {
//               if (err) {
//                 console.log("OTP Insertion Error:", err);
//                 res.status(500).json({ message: "Internal Server Error" });
//               } else {
//                 let expirationTime = new Date(
//                   new Date().getTime() + expiry * 60000
//                 );
//                 // Send OTP to user's email
//                 const jwtToken = await createJWT({
//                   id: user.id,
//                   email,
//                   role: user.role,
//                   clientotp,
//                 });
//                 // console.log("Generated JWT Token:", jwtToken);
//                 // Send OTP to user's email
//                 const replacements = {
//                   name: user.first_name + " " + user.last_name,
//                   otpCode: clientotp,
//                   loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
//                   expirationTime: "10 Minutes",
//                   expirationTime: "10 Minutes",
//                 };
//                 let mailConfig = {
//                   email: result[0]?.email,
//                   subject: `Your Eksathi OTP is ${clientotp}`,
//                 };
//                sendTemplatedEmail (
//                   mailConfig,
//                   replacements,
//                   "SEND_OTP"
//                 );
//                 res.status(403).json({
//                   message: "Verify your account",
//                   desc: "Check your email address for the otp",
//                   userId: user.id,
//                   expirationTime: expirationTime.toISOString(),
//                 });
//               }
//             }
//           );
//         } else {
//           let confirmedPass = await checkHashedPass(
//             validation.value.password,
//             result[0].password
//           );
//           if (!confirmedPass) {
//             res.status(401).json({ message: "Invalid Login Credential" });
//           } else {
//             const { id, first_name, email, role } = result[0];
//             const user = result[0];
//             delete user.password;
//             updateUserActivities(result[0].id, "login", (err, activty) => {
//               if (err) {
//                 console.log(err);
//               }
//             });
//             return res.status(200).json({
//               message: "Logged in successfully",
//               user,
//               jwt: await createJWT({
//                 id,
//                 email,
//                 role,
//               }),
//             });
//           }
//         }
//       }
//     );
//   } catch (error) {
//     return res.status(409).json({ message: "Something went wrong" });
//   }
// };
// JWT based login

const signin = async (req, res) => {
  const { username, email, phone, password } = req.body;
  console.log(req.body);
  let identifier;
  
  if (!username && !email && !phone) {
    return res.status(404).json({
      message: "Must provide anyone of Username, Email and Phone Number",
    });
  }
  
  if (!password)
    return res
      .status(404)
      .json({ message: "Identifier or Password is not Provided" });
      
  const validation = await instituteLoginSchema.validate(req.body);
  
  //validation error
  if (validation.error)
    return res.status(403).json({
      message: validation.error.message,
    });
    
  //validation is ok
  let IdentifierType;
  if (username) {
    identifier = username;
    IdentifierType = typeof validation.value.username;
  } else if (email) {
    identifier = email;
    IdentifierType = typeof validation.value.email;
  } else if (phone) {
    identifier = phone;
    IdentifierType = typeof validation.value.phone;
  } else {
    res.status(400).json({ message: "Something went wrong" });
  }
  
  try {
    mysqlcon.query(
      `SELECT id, avatar_url as profile, first_name, last_name, email, phone, password, role, status, login_count,location FROM users WHERE ${
        username
          ? `username='${username}'`
          : email
          ? `email='${email}'`
          : phone
          ? `phone=${phone}`
          : ""
      }`,
      async function (err, result) {
      
        if (err) {
          console.log("Database Error:", err);
          res.status(500).json({ message: "Internal Server Error" });
        } else if (result.length == 0) {
          return res
            .status(404)
            .json({ message: "Incorrect credentials combination", error: err });
        } else if (result[0].status == "inactive") {
          const user = result[0];

          let clientotp = generateOTP();
          otp = await hashingPassword(clientotp);
          // Set the expiry time for the OTP (in minutes)
          const expiry = 10; // The OTP will expire in 10 minutes
          mysqlcon.query(
            `INSERT INTO otp (user_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [user.id, clientotp, expiry],
            async function (err, otpResult, fields) {
              if (err) {
                console.log("OTP Insertion Error:", err);
                res.status(500).json({ message: "Internal Server Error" });
              } else {
                let expirationTime = new Date(
                  new Date().getTime() + expiry * 60000
                );
                // Send OTP to user's email
                const jwtToken = await createJWT({
                  id: user.id,
                  email,
                  role: user.role,
                  clientotp,
                });
                // console.log("Generated JWT Token:", jwtToken);
                // Send OTP to user's email
                const replacements = {
                  name: user.first_name + " " + user.last_name,
                  otpCode: clientotp,
                  loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
                  expirationTime: "10 Minutes",
                  expirationTime: "10 Minutes",
                };
                let mailConfig = {
                  email: result[0]?.email,
                  subject: `Your Eksathi OTP is ${clientotp}`,
                };
                sendTemplatedEmail(
                  mailConfig,
                  replacements,
                  "SEND_OTP"
                );
                res.status(403).json({
                  message: "Verify your account",
                  desc: "Check your email address for the otp",
                  userId: user.id,
                  expirationTime: expirationTime.toISOString(),
                });
              }
            }
          );
        } else {
          let confirmedPass = await checkHashedPass(
            validation.value.password,
            result[0].password
          );
          if (!confirmedPass) {
            res.status(401).json({ message: "Invalid Login Credential" });
          } else {
            const { id, first_name, email, role } = result[0];
            const user = result[0];
            delete user.password;
            
            // Update user activities
            updateUserActivities(result[0].id, "login", (err, activity) => {
              if (err) {
                console.log(err);
              }
            });
            
            // Increment login_count
            const currentLoginCount = result[0].login_count || 0;
            const newLoginCount = currentLoginCount + 1;
            
            mysqlcon.query(
              `UPDATE users SET login_count = ? WHERE id = ?`,
              [newLoginCount, result[0].id],
             async function (updateErr, updateResult) {
                if (updateErr) {
                  console.log("Login count update error:", updateErr);
                  // Still proceed with login response even if count update fails
                }
                
                // Update the user object with new login count
                user.login_count = newLoginCount;
                user.last_login = new Date().toISOString();
                console.log("test 1000")
                return res.status(200).json({
                  message: "Logged in successfully",
                  user,
                  jwt: await createJWT({
                    id,
                    email,
                    role,
                  }),
                });
              }
            );
          }
        }
      }
    );
  } catch (error) {
    return res.status(409).json({ message: "Something went wrong" });
  }
};

const jwtLogin = async (req, res) => {
  const { token } = req.query;

  console.log("Token received: ", token);

  if (!token) {
    return res.status(400).json({ message: "Token is missing" });
  }

  try {
    // Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { id, email, role, clientotp } = decoded.data;

    console.log(decoded.data);
    // Ensure the user exists and is active
    mysqlcon.query(
      "SELECT * FROM users WHERE id = ? AND email = ?",
      [id, email],
      (err, result) => {
        if (err || result.length === 0) {
          return res.status(400).json({ message: "Invalid user" });
        }

        // If valid, generate a new session or cookie (depends on your auth strategy)
        // console.log("Result : ",res)
        res.status(200).json({
          message: "Login successful",
          user: result[0],
          jwt: token, // Send JWT back if needed in frontend
          redirectTo: "/profile",
          clientOtp: clientotp,
        });
      }
    );
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// forget password and sent reset password link to user's email address
const forgetPassword = (req, res) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  console.log("Received email for password reset:", email);

  // Query the database for the user
  mysqlcon.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (results.length === 0) {
        console.warn("User not found for email:", email);
        return res.status(404).json({ message: "User not found" });
      }

      const user = results[0];

      // Generate token with 10-minute expiry
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "10m",
      });

      // Construct the reset URL
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/auth/password-reset/${token}`;

      // Prepare email data
      const replacements = {
        name: user?.first_name + " " + user?.last_name,
        resetUrl: resetUrl,
      };
      const mailConfig = {
        email: user?.email,
        subject: "Reset Password",
      };
      sendTemplatedEmail(
        mailConfig,
        replacements,
        "RESET_PASSWORD",
        "noreplay@eksathi.com"
      );
      console.log(`Successfully sent password reset link on ${email}`);
      return res.status(200).json({
        message: `Successfully sent password reset link on ${email}`,
      });
    }
  );
};

// New password input from user
const resetPassword = (req, res) => {
  const { token } = req.query;
  console.log("token is ",token)
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Render a form for the user to enter a new password
    res.send(`
      <html>
        <body>
          <form action="/app/auth/update-password" method="post">
            <input type="hidden" name="token" value="${token}">
            <label for="password">New Password:</label>
            <input type="password" name="password" required>
            <button type="submit">Update Password</button>
          </form>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(400).send("Invalid or expired token");
  }
};

// Update password and send success message
const updatePassword = (req, res) => {
  const { token, password } = req.body;
  console.log("req.body users",req.body)
  if (!token) {
    console.log("Invalid token : ", req.body);
    return res.status(403).json({
      message: "Invalid request, Please send new reset request again",
    });
  }
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by userId in token
    mysqlcon.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.userId],
      async (error, results) => {
        if (error) {
          return res.status(500).send({ message: "Internal Server Error" });
        }

        if (results.length === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        const user = results[0];

        // Hash the password
        let hashpassword = await hashingPassword(password);

        // Update user's password
        mysqlcon.query(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashpassword, user.id],
          (error) => {
            if (error) {
              return res.status(500).json({ message: "Internal Server Error" });
            }

            // Send Email
            const replacements = {
              name: user?.first_name + " " + user?.last_name,
              websiteUrl: "https://www.eksathi.com",
            };
            let mailConfig = {
              email: user?.email,
              subject: "Your Eksathi password has been successfully changed",
            };
            sendTemplatedEmail(
              mailConfig,
              replacements,
              "RESET_PASSWORD_SUCCESS"
            );

            // Redirect to login page
            return res
              .status(200)
              .json({ message: "Password changed successfully" });
            res.redirect(
              `${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }/auth/login`
            );
          }
        );
      }
    );
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if email exists in users table
    const userQuery = "SELECT * FROM users WHERE email = ?";
    mysqlcon.query(userQuery, [email], async (err, user) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      if (user.length === 0) {
        return res.status(400).json({ message: "Email does not exist" });
      }

      // Check if user account is inactive

      // Generate and insert new OTP into otp table with expiry time
      let clientotp = generateOTP();
      console.log("otp", clientotp);
      let otp = await hashingPassword(clientotp);
      const expiry = 10; // The OTP will expire in 10 minutes
      const insertQuery =
        "INSERT INTO otp (user_id, code, expired_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE)))";
      mysqlcon.query(insertQuery, [user[0].id, clientotp, expiry]);

      let expirationTime = new Date(new Date().getTime() + expiry * 60000);
      // Send OTP to user's email
      const replacements = {
        name: user[0]?.first_name + " " + user[0]?.last_name,
        otpCode: clientotp,
        expirationTime: "10 Minutes",
      };
      let mailConfig = {
        email: user[0]?.email,
        subject: `Your Eksathi OTP is ${clientotp}`,
      };
     sendTemplatedEmail(mailConfig, replacements, "SEND_OTP");

      return res.status(200).json({
        message: "OTP sent successfully",
        expirationTime: expirationTime.toISOString(),
      });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  const { userId, code } = req.body;
  // console.log(userId)

  const now = new Date().toISOString();
  if (!userId || !code) {
    return res.status(403).json({ message: "Invalid OTP Code" });
  }

  try {
    // Check if the OTP code is valid and hasn't expired
    const UserDetails = await DBMODELS.users.findOne({where:{id:userId}})
   
    const checkOtp = await DBMODELS.otp.findOne({
      where: { user_id: userId, code: code, expired_at: { [Op.gt]: now } },
    });
    if (checkOtp) {
      await DBMODELS.users.update(
        { status: "active" },
        { where: { id: userId } }
      );
      await sendWelcomeMail(UserDetails.email,UserDetails.username,UserDetails.role,`https://www.eksathi.com/${UserDetails.username}`,UserDetails.first_name,UserDetails.last_name)
      await DBMODELS.otp.destroy({ where: { code: code } });
      return res.status(200).json({
        message: "OTP code verified successfully",
        results: {},
      });
    } else {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    mysqlcon.query(
      "SELECT * FROM otp WHERE user_id = ? AND code = ? AND expired_at > ?",
      [userId, code, now],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        if (result.length === 0) {
          return res
            .status(400)
            .json({ message: "Invalid or expired OTP code" });
        }
        // Update the user status into the active status
        mysqlcon.query(
          "UPDATE users SET status = 'active' WHERE id = ?",
          [userId],
          function (err, updateStatus) {
            if (err) {
              console.log(err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
            // Delete the OTP record from the database
            mysqlcon.query(
              "DELETE FROM otp WHERE id =?",
              [result[0].id],
              (err, deleteRes) => {
                if (err) {
                  console.log(err);
                  return res
                    .status(500)
                    .json({ message: "Internal Server Error" });
                }
                return res.status(200).json({
                  message: "OTP code verified successfully",
                  results: deleteRes,
                });
              }
            );
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyInstituteOTP = async (req, res) => {
  const { userId, code } = req.body;
  const now = new Date().toISOString();

  if (!userId || !code) {
    console.log("Invalid OTP: ", req.body);
    return res.status(403).json({ message: "Invalid OTP Code" });
  }

  try {
    console.log("Now : " + now);
    // Check if the OTP code is valid and hasn't expired
    mysqlcon.query(
      "SELECT * FROM institute_otp WHERE institute_id = ? AND code = ? AND expired_at > ?",
      [userId, code, now],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        if (result.length === 0) {
          return res
            .status(400)
            .json({ message: "Invalid or expired OTP code" });
        }
        // Update the user status into the active status
        mysqlcon.query(
          "UPDATE institutes SET status = 'Onboarding' WHERE id = ?",
          [userId],
          function (err, updateStatus) {
            if (err) {
              console.log(err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
            // Delete the OTP record from the database
            mysqlcon.query(
              "DELETE FROM institute_otp WHERE id =?",
              [result[0].id],
              (err, deleteRes) => {
                if (err) {
                  console.log(err);
                  return res
                    .status(500)
                    .json({ message: "Internal Server Error" });
                }
                return res.status(200).json({
                  message: "OTP code verified successfully",
                  results: deleteRes,
                });
              }
            );
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// const changePassword = (req, res) => {
//   // extract user ID and password from request body
//   const userId = req.body.userId;
//   const oldPassword = req.body.password;
//   const newPassword = req.body.newpassword;
//   const isInstitute = req.body.isInstitute;

//   console.log("Change password: ", req.body);

//   // check if old password and new password are available
//   if (!oldPassword || !newPassword) {
//     return res
//       .status(403)
//       .json({ message: "Password and new password are not available" });
//   }

//   // query the database for the user's current password
//   let sql;
//   if(isInstitute){
//     sql = "SELECT password FROM institutes WHERE id = ?"
//   } else {
//   sql =   "SELECT password FROM users WHERE id = ?"
//   }

//   console.log("sql is ___________________________________",sql)
//   mysqlcon.query(
//     sql,
//     [userId],
//     async (error, results, fields) => {
//       if (error) {
//         res
//           .status(500)
//           .json({ message: "An error occurred while fetching user data." });
//         return;
//       }

//       // check if the old password matches the current password
//       const currentPassword = results[0].password;
//       console.log("Current password : ", currentPassword);

//       let confirmedPass = await checkHashedPass(oldPassword, currentPassword);
//       if (!confirmedPass) {
//         res.status(401).json({ message: "The old password is incorrect." });
//         return;
//       }

//       let hashpassword = await hashingPassword(newPassword);

//       // update the user's password in the database
//       mysqlcon.query(
//         "UPDATE users SET password = ? WHERE id = ?",
//         [hashpassword, userId],
//         (error, results, fields) => {
//           if (error) {
//             res.status(500).json({
//               message: "An error occurred while updating the password.",
//             });
//             return;
//           }

//           // send success response
//           res.status(200).json({ message: "Password updated successfully." });
//         }
//       );
//     }
//   );
// };


const changePassword = (req, res) => {
  // extract user ID and password from request body
  const userId = req.body.userId;
  const oldPassword = req.body.password;
  const newPassword = req.body.newpassword;
  const isInstitute = req.body.isInstitute;

  console.log("Change password: ", req.body);

  // check if old password and new password are available
  if (!oldPassword || !newPassword) {
    return res
      .status(403)
      .json({ message: "Password and new password are not available" });
  }

  // query the database for the user's current password
  let sql;
  if (isInstitute) {
    sql = "SELECT password FROM institutes WHERE id = ?";
  } else {
    sql = "SELECT password FROM users WHERE id = ?";
  }
  mysqlcon.query(
    sql,
    [userId],
    async (error, results, fields) => {
      if (error) {
        res
          .status(500)
          .json({ message: "An error occurred while fetching user data." });
        return;
      }

      // check if the old password matches the current password
      const currentPassword = results[0].password;
      console.log("Current password : ", currentPassword);

      let confirmedPass = await checkHashedPass(oldPassword, currentPassword);
      if (!confirmedPass) {
        res.status(401).json({ message: "The old password is incorrect." });
        return;
      }

      // Hash the new password
      let hashpassword = await hashingPassword(newPassword);

      // update the user's password in the database
      let updateSql;
      if (isInstitute) {
        updateSql = "UPDATE institutes SET password = ? WHERE id = ?";
      } else {
        updateSql = "UPDATE users SET password = ? WHERE id = ?";
      }

      mysqlcon.query(
        updateSql,
        [hashpassword, userId],
        (error, results, fields) => {
          if (error) {
            res.status(500).json({
              message: "An error occurred while updating the password.",
            });
            return;
          }

          // send success response
          res.status(200).json({ message: "Password updated successfully." });
        }
      );
    }
  );
};



const verifyUser = async (req, res) => {
  let id = req.instituteId;
  const { database_name } = req.institute;
  let { email } = req.body;
  if (!id) {
    return res.status(498).json({});
  }
  if (!email) {
    return res.status(400).json({ message: "Email ID is Mandatory" });
  }
  try {
    if (database_name) {
      const isUserExists = await checkUserByEmail(database_name, email).catch(
        (err) => {
          console.log(err);
          res.status(500).json({ message: "Internal Server Error" });
        }
      );
      if (isUserExists) {
        return res.status(200).json({ message: "User Exists" });
      } else {
        return res.status(403).json({ message: "User doesn't exists" });
      }
    } else {
      return res.status(409).json({ message: "Contact Admin" });
    }
  } catch (error) {
    console.log(error);
    return res.status(409).json({ message: "Something went wrong" });
  }
};

module.exports = {
  signin,
  emailAlreadyExist,
  emailOrPhoneAlreadyExist,
  signup,
  jwtLogin,
  forgetPassword,
  resetPassword,
  updatePassword,
  changePassword,
  sendOTP,
  verifyOTP,
  verifyInstituteOTP,
  verifyUser,
  additionalInfo,
};
