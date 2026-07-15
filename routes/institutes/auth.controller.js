const { uid } = require("uid");
require("dotenv").config();
const { mysqlcon } = require("../../model/db");
const sendEmailService = require("../../utils/email");
const {
  generateOTP,
} = require("../../service/auth.service");
const jwt = require("jsonwebtoken");
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize(
  process.env.DBNAME,
  process.env.DBUSER,
  process.env.DBPASS,
  {
    host: process.env.DBHOST,
    dialect: "mysql",
    dialectOptions: {
      connectTimeout: 60000, // 60 seconds timeout
    },
    logging: console.log,
  }
);

const Institute = require("../../models/institutes")(sequelize, DataTypes);
const {
  checkHashedPass,
  hashingPassword,
  instituteLoginSchema,
  InstituteRegisterSchema,
} = require("../../utils/validation");
const {
  createUsername,
  createApiKey,
  generateToken,
  generateSecret,
  createUsernameForUser,
  createJWT,
  createDatabaseName,
} = require("./auth.service");
const {
  usersSchema,
  answersSchema,
  questionsSchema,
  votesSchema,
  replySchema,
  commentsSchema,
  categorySchema,
  reportSchema,
} = require("./institutes.schema");
const { checkUserByEmail } = require("./utilities.service");
const { updateUserActivities } = require("../../service/utilities.service");

// const signup = async (req, res) => {
//   let {
//     name,
//     email,
//     password,
//     phone,
//     contact_name,
//     contact_email,
//     contact_phone,
//     address,
//     city,
//     state,
//     country,
//     postalCode,
//   } = req.body;

//   if (!email || !password) {
//     return res
//       .status(400)
//       .json({ message: "Name, Email or Password is missing" });
//   }

//   if (!name) {
//     name = email.split("@")[0];
//   }

//   // const validation = await InstituteRegisterSchema.validate(req.body);
//   // //validation error
//   // if (validation.error)
//   //     return res.status(403).json({
//   //         message: validation.error.message,
//   //     });
//   // //validation is ok

//   try {
//     mysqlcon.query(
//       `SELECT email FROM institutes WHERE email='${email}'`,
//       (err, result) => {
//         if (err) {
//           console.log(err);
//           return res.status(500).json({ message: "Internal Server Error" });
//         }
//         console.log("Result: ", result);
//         if (result.length) {
//           return res.status(409).json({ message: "Already Registered" });
//         } else {
//           // Generate a unique database name for the institute
//           const dbName = `eks_${name
//             .replace(/\s+/g, "")
//             .toLowerCase()}_${Date.now()}`;

//           //Generate Username
//           const username = createUsername();

//           // create a new database for the institute
//           mysqlcon.query(`CREATE DATABASE ${dbName}`, (err) => {
//             if (err) {
//               console.error("ye error : ",err);
//               res
//                 .status(500)
//                 .json({
//                   message: "Internal server error12",
//                   error: err.message,
//                 });
//             } else {
//               // create a new table for the institute
//               // const createTableQuery = `CREATE TABLE ${dbName}.questions (
//               //     id INT(11) NOT NULL AUTO_INCREMENT,
//               //     question TEXT NOT NULL,
//               //     answer TEXT NOT NULL,
//               //     PRIMARY KEY (id)
//               // )`;
//               console.log(
//                 `Creating Tables for ${name}, under database name '${dbName}'`
//               );
//               mysqlcon.query(usersSchema(dbName), async (err) => {
//                 if (err) {
//                   console.error(err);
//                   res.status(500).json({ message: "Internal server error 1" });
//                 } else {
//                   console.log("Users table created");
//                   mysqlcon.query(questionsSchema(dbName), (err) => {
//                     if (err) throw err;
//                     console.log("Questions table created");
//                     mysqlcon.query(answersSchema(dbName), (err) => {
//                       if (err) throw err;
//                       console.log("Answers table created");
//                       mysqlcon.query(votesSchema(dbName), (err) => {
//                         if (err) throw err;
//                         console.log("Votes table created");
//                         mysqlcon.query(commentsSchema(dbName), (err) => {
//                           if (err) throw err;
//                           console.log("Comments table created");
//                           mysqlcon.query(replySchema(dbName), (err) => {
//                             if (err) throw err;
//                             console.log("Replies table created");
//                             mysqlcon.query(categorySchema(dbName), (err) => {
//                               if (err) throw err;
//                               console.log("Categories table created");
//                               mysqlcon.query(reportSchema(dbName), (err) => {
//                                 if (err) throw err;
//                                 console.log("Report table created");
//                               });
//                             });
//                           });
//                         });
//                       });
//                     });
//                   });

//                   // insert the new institute into the main database
//                   let hashpassword = await hashingPassword(password);
//                   const insertQuery = `INSERT INTO institutes (name, email, password, username, database_name) VALUES (?, ?, ?, ?, ?)`;
//                   const values = [name, email, hashpassword, username, dbName];
//                   mysqlcon.query(insertQuery, values, async (err,results, fields) => {
//                     if (err) {
//                       console.error(err);
//                       res
//                         .status(500)
//                         .json({ message: "Internal server error 2" });
//                     }
//                     console.log({ results, fields });
//                       // res.status(200).json({ message: "Institute registered successfully" });
//                     let clientotp = generateOTP();
//             let userId = results.insertId;
//             console.log("otp1 :", clientotp);
//             otp = await hashingPassword(clientotp);
//             // Set the expiry time for the OTP (in minutes)
//             const expiry = 10; // The OTP will expire in 10 minutes
//             mysqlcon.query(
//               `INSERT INTO institute_otp (institute_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
//               [userId, clientotp, expiry],
//               function (err, result) {
//                 if (err) {
//                   console.log(err);
//                   res
//                     .status(500)
//                     .json({ message: "Internal Server Error" });
//                 } else {
//                   // Send OTP to user's email
//                   const replacements = {
//                     name: name ,
//                     otpCode: clientotp,
//                     expirationTime: "10 Minutes",
//                   };
//                   let mailConfig = {
//                     email: email,
//                     subject: `Your Verification OTP is ${clientotp}`,
//                   };
//                   sendEmailService.sendTemplatedEmail(
//                     mailConfig,
//                     replacements,
//                     "SEND_OTP"
//                   );
//                   res.status(200).json({
//                     message: " Institute registered Successfully. Verify your account",
//                     desc: "Check your email address for the otp",
//                     userId: userId,
//                     results: results,
//                   });
//                 }
//               }
//             );
//                   });
//                 }
//               });
//             }
//           });
//         }
//       }
//     );
//   } catch (error) {
//     console.log(err);
//     res.status(409).json({ message: "Something went worng" });
//   }
// };

const signup = async (req, res) => {
  let { name, email, mobile, password } = req.body;
  
  // Input validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email or Password is missing" });
  }
  if (!mobile) {
    return res.status(400).json({ message: "Mobile number is missing" });
  }
  if (!name) {
    return res.status(400).json({ message: "Name is missing" });
  }

  // Generate username and database name
  const username = createUsername();
  const databaseName = createDatabaseName(email);

  try {
    // Check if email or mobile already exists
    mysqlcon.query(
      `SELECT email, mobile FROM institutes WHERE email = ? OR mobile = ?`,
      [email, mobile],
      async (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        // Check if email or mobile already exists
        if (result.length > 0) {
          const existingEmail = result.find(row => row.email === email);
          const existingMobile = result.find(row => row.mobile === mobile);

          if (existingEmail && existingMobile) {
            return res.status(409).json({ 
              message: "Email and Mobile number are already registered" 
            });
          } else if (existingEmail) {
            return res.status(409).json({ 
              message: "Email is already registered" 
            });
          } else if (existingMobile) {
            return res.status(409).json({ 
              message: "Mobile number is already registered" 
            });
          }
        }

        // Hash the password
        let hashpassword = await hashingPassword(password);

        // Insert the new institute into the database
        const insertQuery = `INSERT INTO institutes (name, email, mobile, password, username, database_name) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [name, email, mobile, hashpassword, username, databaseName];

        mysqlcon.query(insertQuery, values, async (err, results, fields) => {
          if (err) {
            console.error("Insert error:", err);
            return res.status(500).json({ message: "Internal server error" });
          }

          console.log("Insert results:", results);
          console.log("Insert fields:", fields);

          // Generate OTP
          let clientotp = generateOTP();
          let userId = results.insertId;
          console.log("Generated OTP:", clientotp);

          // Set the expiry time for the OTP (in minutes)
          const expiry = 10;

          mysqlcon.query(
            `INSERT INTO institute_otp (institute_id, code, expired_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [userId, clientotp, expiry],
            function (err, result) {
              if (err) {
                console.error("OTP insert error:", err);
                return res.status(500).json({ 
                  message: "Failed to generate OTP. Please try again." 
                });
              }

              // Send OTP to user's email
              const replacements = {
                name: name,
                otpCode: clientotp,
                expirationTime: "10 Minutes",
              };

              let mailConfig = {
                email: email,
                subject: `Your Verification OTP is ${clientotp}`,
              };

              sendEmailService.sendTemplatedEmail(
                mailConfig,
                replacements,
                "SEND_OTP"
              );

              res.status(200).json({
                message: "Institute registered successfully. Verify your account",
                desc: "Check your email address for the OTP",
                userId: userId,
                results: results,
              });
            }
          );
        });
      }
    );
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};




const signin = async (req, res) => {
  const { username, email, phone, password } = req.body;
  console.log("Institute Login");

  let identifier;
  if (!username && !email && !phone) {
    return res
      .status(404)
      .json({
        message: "Must provide anyone of Username, Email and Phone Number",
      });
  }
  if (!password)
    return res
      .status(404)
      .json({ message: "Identifier or Password is not Provided" });
  
  const validation = await instituteLoginSchema.validate(req.body);
  //validation error
  console.log("req.body is ", req.body);
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
    return res.status(400).json({ message: "Something went wrong" });
  }
  
  try {
    mysqlcon.query(
      `SELECT i.*,ip.city,ip.state,ip.country FROM institutes i  LEFT JOIN  institute_profiles ip ON ip.institute_id = i.id WHERE ${
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
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error", err });
        } else if (result.length == 0) {
          return res
            .status(404)
            .json({ message: "Incorrect credentials combination" });
        } else if (result[0].status == "Verification") {
          const user = result[0];
          let clientotp = generateOTP();
          // let clientotp = otp
          // console.log("otp=============", clientotp);
          let otp = await hashingPassword(clientotp); // Added 'let' declaration
          const expiry = 10; 
          mysqlcon.query(
            `INSERT INTO institute_otp (institute_id, code, expired_at) values (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [user.id, clientotp, expiry], // Added parameters array
            async function (err, result) {
              if (err) {
                console.log("Error Institute", err);
                return res.status(500).json({ message: "Internal Server Error" });
              } else {
                let expirationTime = new Date(
                  new Date().getTime() + expiry * 60000
                );
                console.log("User token data is ",user)
                // Send OTP to user's email
                const jwtToken = await createJWT({
                  id: user.id,
                  email: user.email, // Fixed: use user.email instead of just email
                  role: user.role,
                  clientotp,
                });
                
                // Send OTP to user's email
                const replacements = {
                  name: user.first_name + " " + user.last_name,
                  otpCode: clientotp,
                  loginLink: `https://www.eksathi.com/address?token=${jwtToken}`,
                  expirationTime: "10 Minutes",
                };
                
                let mailConfig = {
                  email: user.email, // Fixed: use user.email instead of result[0]?.email
                  subject: `Your Eksathi OTP is ${clientotp}`,
                };
                
                sendEmailService.sendTemplatedEmail(
                  mailConfig,
                  replacements,
                  "SEND_OTP"
                );
                
                return res.status(403).json({
                  message: "Verify your account",
                  desc: "Check your email address for the otp",
                  userId: user.id,
                  expirationTime: expirationTime.toISOString(),
                  status:user.status,
                  role: user.role,
                });
              }
            }
          );
        } else {
          // console.log("Account Result ", result);
          let confirmedPass = await checkHashedPass(
            validation.value.password,
            result[0].password
          );
          if (!confirmedPass) {
            return res.status(401).json({ message: "Invalid Login Credential" });
          } else {
            console.log("resultes is  100",result)
            const { id, first_name, email, role } = result[0];
         
            const user = result[0];
            delete user.password;
            
            updateUserActivities(result[0].id, "login", (err, activity) => {
              if (err) {
                console.log(err);
              }
            });
            
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
        }
      }
    );
  } catch (error) {
    return res.status(409).json({ message: "Something went wrong" });
  }
};



// const forgetPassword = (req, res) => {
//   res.status(200).json({
//     message: "Forget Password Route, Fuctionality Pending",
//   });
// };

const forgetPassword = (req, res) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // console.log("Received email for password reset:", email);

  // Query the database for the user
  mysqlcon.query(
    "SELECT * FROM institutes WHERE email = ?",
    [email],
    (error, results) => {
      if (error) {
        // console.error("Database error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (results.length === 0) {
        // console.warn("User not found for email:", email);
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
      }/auth/institute/password-reset/${token}`;

      // Prepare email data
      const replacements = {
        name: user?.first_name + " " + user?.last_name,
        resetUrl: resetUrl,
      };
      const mailConfig = {
        email: user?.email,
        subject: "Reset Password",
      };
      sendEmailService.sendTemplatedEmail(
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

const resetPassword = (req, res) => {
  const { token } = req.query;
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Render a form for the user to enter a new password
    res.send(`
      <html>
        <body>
          <form action="/v1/update-password" method="post">
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




const updatePassword = (req, res) => {
  const { token, password } = req.body;
  console.log("req.body",req.body)
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
      "SELECT * FROM institutes WHERE id = ?",
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
          "UPDATE institutes SET password = ? WHERE id = ?",
          [hashpassword, user.id],
          (error) => {
            if (error) {
              return res.status(500).json({ message: "Internal Server Error" });
            }

            // Send Email
            const replacements = {
              name:  user.name,
              websiteUrl: "https://www.eksathi.com",
            };
            let mailConfig = {
              email: user?.email,
              subject: "Your Eksathi password has been successfully changed",
            };
            sendEmailService.sendTemplatedEmail(
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


const sendOTP = (req, res) => {
  res.status(200).json({
    message: "Send OTP Route, Fuctionality Pending",
  });
};

const verifyOTP = (req, res) => {
  res.status(200).json({
    message: "Verify OTP Route, Fuctionality Pending",
  });
};


const changePassword = (req, res) => {
  res.status(200).json({
    message: "Change Password Route, Fuctionality Pending",
  });
};

const generateAPIKey = async (req, res) => {
  const { id, alias } = req.body;
  if (!id) {
    // console.log("ID not found");
    res.status(404).json({ message: "Institute id is required" });
  }
  try {
    mysqlcon.query(
      `SELECT * FROM institutes WHERE id = ${id}`,
      async (err, result) => {
        if (err) {
          // console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        if (result.length) {
          const secret = generateSecret();
          const token = generateToken(id, secret);
          await createApiKey(id, secret, token, alias)
            .then((key) => {
              // console.log("API Key : ", key);
              res.status(200).json({
                message: "API credentials generated successfully",
                alias,
                apikey: key,
                token,
                secret,
              });
            })
            .catch((err) => {
              console.log(err);
              res.status(500).json({
                message: "Internal server error",
              });
            });
        } else {
          return res.status(409).json({
            message: "Institute does not exist",
          });
        }
      }
    );
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "Something went wrong",
    });
  }
};

const getAPIKey = (req, res) => {
  res.status(200).json({
    message: "Get API Key Route, Fuctionality Pending",
  });
};

const removeAPIKey = (req, res) => {
  const { id, apikey } = req.body;
  if (!id || !apikey) {
    return res
      .status(404)
      .json({ message: "Institute ID or API Key is missing" });
  }
  try {
    // Get API key from database
    mysqlcon.query(
      "SELECT * FROM api_credentials WHERE institute_id = ? AND api_key = ?",
      [id, apikey],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ error: "Internal server error" });
        }

        // Check if API key exists
        if (results.length === 0) {
          return res.status(404).json({ error: "API key not found" });
        }

        // Delete API key from database
        mysqlcon.query(
          "DELETE FROM api_credentials WHERE institute_id = ? AND api_key = ?",
          [id, apikey],
          (error, results) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ error: "Internal server error" });
            }

            // Return success response
            return res
              .status(200)
              .json({ message: "API key romoved successfully" });
          }
        );
      }
    );
  } catch (error) {
    console.log(error);
    res.status(409).json({ message: "Something went wrong" });
  }
};

const createUser = (req, res) => {
  let username = createUsernameForUser();
  let id = req.instituteId;
  let {
    email,
    name,
    profile_pic,
    instituteName,
    delegateCountry,
    delegateDesignation,
  } = req.body;
  if (!id) {
    return res.status(498).json({});
  }
  if (!email || !name || !instituteName) {
    return res
      .status(400)
      .json({ message: "Institute Name, Email and Name is Mandatory" });
  }
  try {
    mysqlcon.query(`SELECT * FROM institutes WHERE id=${id}`, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      if (result.length) {
        if (result[0]?.database_name) {
          let sql = `INSERT INTO ${
            result[0].database_name
          }.users(username, name, email ${
            profile_pic ? ", profile_pic" : ""
          }, institute_name${delegateCountry ? `, delegate_country` : ""}${
            delegateDesignation ? `, delegate_designation` : ""
          }) values(?, ?, ? ${profile_pic ? `,'${profile_pic}'` : ""}, ?${
            delegateCountry ? `,'${delegateCountry}'` : ""
          } ${delegateDesignation ? `,'${delegateDesignation}'` : ""} );`;
          let values = [username, name, email, instituteName];
          // console.log({ values }, "Query: ", sql);
          mysqlcon.query(sql, values, (err, results) => {
            if (err) {
              if (err.code === "ER_DUP_ENTRY") {
                // Handle duplicate entry error
                console.log("Duplicate entry error:", err.message);
                return res.status(409).json({ message: "Duplicate entry" });
              } else {
                // Handle other errors
                console.log("Error:", err.message);
                return res
                  .status(500)
                  .json({ message: "Internal Server Error" });
              }
            }
            return res.status(200).json({
              success: 1,
              message: "User created successfully",
              results,
            });
          });
        } else {
          return res.status(409).json({ message: "Contact Admin" });
        }
      } else {
        return res
          .status(401)
          .json({ message: "Unautherized Access, Institute not found" });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(409).json({ message: "Something went wrong" });
  }
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


// const getInstituteAndUsers = async (req, res) => {
//   try {
//     const { userId, instituteId, name, email, contact_no, subject,description } = req.body;
// // console.log("req.body is ",req.body)
//     // Validate required fields
//     if (!userId || !instituteId) {
//       return res.status(400).json({
//         success: false,
//         message: 'userId and instituteId are required'
//       });
//     }

//     if (!name || !email || !message) {
//       return res.status(400).json({
//         success: false,
//         message: 'name, email, and message are required'
//       });
//     }

//     // Get institute details with profile information
//     // const instituteQuery = `
//     //   SELECT 
//     //     i.id,
//     //     i.name as instituteName,
//     //     i.email as instituteEmail,
//     //     i.mobile  as institutePhone,
//     //     i.website as instituteWebsite,
//     //     i.established_year as establishedYear,
//     //     i.delegate_country as delegateCountry,
//     //     i.delegate_designation as delegateDesignation,
//     //     ip.facebook,
//     //     ip.address as instituteAddress,
//     //     ip.twitter,
//     //     ip.linkdin as linkedin,
//     //     ip.instagram,
//     //     ip.youtube,
//     //     ip.github,
//     //     ip.website as profileWebsite
//     //   FROM institutes i
//     //   LEFT JOIN institute_profiles ip ON i.id = ip.institute_id
//     //   WHERE i.id = ?
//     // `;
//     const instituteQuery = `
//   SELECT 
//     i.id,
//     i.name AS instituteName,
//     i.email AS instituteEmail,
//     i.mobile AS institutePhone,
//     ip.website AS instituteWebsite,
//     ip.establishmentDate AS establishedYear,
//     ip.country AS delegateCountry,
//     ip.pocdesignation AS delegateDesignation,
//     ip.facebook,
//     ip.address AS instituteAddress,
//     ip.twitter,
//     ip.linkdin AS linkedin,
//     ip.instagram,
//     ip.youtube,
//     ip.github
//   FROM institutes i
//   LEFT JOIN institute_profiles ip ON i.id = ip.institute_id
//   WHERE i.id = ?
// `;


//     mysqlcon.query(instituteQuery, [instituteId], async (err, instituteResults) => {
//       if (err) {
//         // console.error('Database error fetching institute:', err);
//         return res.status(500).json({
//           success: false,
//           message: 'Error fetching institute details',
//           error: err.message
//         });
//       }

//       if (!instituteResults || instituteResults.length === 0) {
//         return res.status(404).json({
//           success: false,
//           message: 'Institute not found'
//         });
//       }

//       const institute = instituteResults[0];

//       // Get user details
//       const userQuery = `
//         SELECT 
//           id,
//           username,
//           email,
//           first_name,
//           last_name
//           mobile
//         FROM users 
//         WHERE id = ?
//       `;

//       mysqlcon.query(userQuery, [userId], async (err, userResults) => {
//         if (err) {
//           console.error('Database error fetching user:', err);
//           return res.status(500).json({
//             success: false,
//             message: 'Error fetching user details',
//             error: err.message
//           });
//         }

//         if (!userResults || userResults.length === 0) {
//           return res.status(404).json({
//             success: false,
//             message: 'User not found'
//           });
//         }

//         const user = userResults[0];

//         try {
//           // Determine if social links should be shown
//           const hasSocialLinks = institute.facebook || institute.twitter || 
//                                 institute.linkedin || institute.instagram;
          
//           // Send email using the template
//           const emailSent = await sendEmailService.sendInstituteContactMail(
//             institute.instituteName,
//             institute.instituteEmail,
//             institute.institutePhone,
//             institute.instituteAddress,
//             institute.instituteWebsite || institute.profileWebsite,
//             institute.establishedYear,
//             institute.delegateCountry,
//             institute.delegateDesignation,
//             user.name,
//             req.body.senderDesignation || '',
//             name,
//             user.name,
//             user.email,
//             contact_no || institute.institutePhone || user.mobile,
//             req.body.expiryDays || '7',
//             req.body.showSocialLinks !== undefined ? req.body.showSocialLinks : hasSocialLinks,
//             institute.facebook || req.body.facebookUrl || '',
//             institute.linkedin || req.body.linkedinUrl || '',
//             institute.twitter || req.body.twitterUrl || '',
//             institute.instagram || '',
//             institute.youtube || '',
//             institute.github || '',
//             email,
//             message
//           );

//           if (!emailSent) {
//             return res.status(500).json({
//               success: false,
//               message: 'Failed to send email'
//             });
//           }

//           // Create contact record in contacts table
//           const contactQuery = `
//             INSERT INTO contacts 
//             (name, email, contact_no, subject,description, createdAt, updatedAt) 
//             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
//           `;

//           const contactValues = [
//             name,
//             email,
//             contact_no || null,
//             message
//           ];

//           mysqlcon.query(contactQuery, contactValues, (err, contactResults) => {
//             if (err) {
//               console.error('Error creating contact record:', err);
//               return res.status(500).json({
//                 success: false,
//                 message: 'Email sent but failed to create contact record',
//                 error: err.message
//               });
//             }

//             // Return success response
//             return res.status(200).json({
//               success: true,
//               message: 'Connection request sent successfully',
//               data: {
//                 contactId: contactResults.insertId,
//                 institute: institute.instituteName,
//                 sentTo: email,
//                 sentBy: user.name,
//                 recipientName: name,
//                 contactNumber: contact_no || null
//               }
//             });
//           });

//         } catch (emailError) {
//           console.error('Error sending email:', emailError);
//           return res.status(500).json({
//             success: false,
//             message: 'Error sending email',
//             error: emailError.message
//           });
//         }
//       });
//     });

//   } catch (error) {
//     console.error('Unexpected error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };


const getInstituteAndUsers = async (req, res) => {
  try {
    const { userId, instituteId, name, email, contact_no, subject, description } = req.body;
    console.log("req.body is ++++++++++++++++ ", req.body);

    // Validate required fields
    if (!userId || !instituteId) {
      return res.status(400).json({
        success: false,
        message: 'userId and instituteId are required'
      });
    }

    if (!name || !email || !description) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and description are required'
      });
    }

    // Normalize userId to array format
    // let userIdArray = [];
    // if (Array.isArray(userId)) {
    //   userIdArray = userId.map(id => parseInt(id));
    // } else {
    //   userIdArray = [parseInt(userId)];
    // }

    const instituteQuery = `
      SELECT 
        i.id,
        i.name AS instituteName,
        i.email AS instituteEmail,
        i.mobile AS institutePhone,
        ip.website AS instituteWebsite,
        ip.establishmentDate AS establishedYear,
        ip.country AS delegateCountry,
        ip.pocdesignation AS delegateDesignation,
        ip.facebook,
        ip.address AS instituteAddress,
        ip.twitter,
        ip.linkdin AS linkedin,
        ip.instagram,
        ip.youtube,
        ip.github
      FROM institutes i
      LEFT JOIN institute_profiles ip ON i.id = ip.institute_id
      WHERE i.id = ?
    `;

    mysqlcon.query(instituteQuery, [instituteId], async (err, instituteResults) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching institute details',
          error: err.message
        });
      }

      if (!instituteResults || instituteResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Institute not found'
        });
      }

      const institute = instituteResults[0];

      // Get user details - use the first userId from array
      // const primaryUserId = userIdArray[0];
      const userQuery = `
        SELECT 
          id,
          username,
          email,
          first_name,
          last_name,
          phone
        FROM users 
        WHERE id = ?
      `;

      mysqlcon.query(userQuery, userId, async (err, userResults) => {
        if (err) {
          console.error('Database error fetching user:', err);
          return res.status(500).json({
            success: false,
            message: 'Error fetching user details',
            error: err.message
          });
        }

        if (!userResults || userResults.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const user = userResults[0];

        try {
          // Determine if social links should be shown
          const hasSocialLinks = institute.facebook || institute.twitter || 
                                institute.linkedin || institute.instagram;
          
          // Send email using the template
          const emailSent = await sendEmailService.sendInstituteContactMail(
            institute.instituteName,
            institute.instituteEmail,
            institute.institutePhone,
            institute.instituteAddress,
            institute.instituteWebsite || institute.profileWebsite,
            institute.establishedYear,
            institute.delegateCountry,
            institute.delegateDesignation,
            user.username || `${user.first_name} ${user.last_name}`,
            req.body.senderDesignation || '',
            name,
            user.username || `${user.first_name} ${user.last_name}`,
            user.email,
            contact_no || institute.institutePhone || user.phone,
            req.body.expiryDays || '7',
            req.body.showSocialLinks !== undefined ? req.body.showSocialLinks : hasSocialLinks,
            institute.facebook || req.body.facebookUrl || '',
            institute.linkedin || req.body.linkedinUrl || '',
            institute.twitter || req.body.twitterUrl || '',
            institute.instagram || '',
            institute.youtube || '',
            institute.github || '',
            email,
            description
          );

          if (!emailSent) {
            return res.status(500).json({
              success: false,
              message: 'Failed to send email'
            });
          }

          // Check if contact already exists for this institute
          const checkContactQuery = `
            SELECT id, user_id 
            FROM contacts 
            WHERE institute_id = ? AND email = ?
          `;
          
          mysqlcon.query(checkContactQuery, [instituteId, email], (err, existingContacts) => {
            if (err) {
              console.error('Error checking existing contact:', err);
              return res.status(500).json({
                success: false,
                message: 'Error checking existing contact',
                error: err.message
              });
            }

            if (existingContacts && existingContacts.length > 0) {
              // Contact exists, update user_id array
              const existingContact = existingContacts[0];
              let existingUserIds = [];
              
              try {
                // Handle different possible formats of user_id
                if (existingContact.user_id) {
                  if (typeof existingContact.user_id === 'string') {
                    // Try to parse if it's a JSON string
                    existingUserIds = JSON.parse(existingContact.user_id);
                  } else if (Array.isArray(existingContact.user_id)) {
                    // Already an array
                    existingUserIds = existingContact.user_id;
                  } else {
                    // Single value, convert to array
                    existingUserIds = [existingContact.user_id];
                  }
                }
                
                // Ensure existingUserIds is an array
                if (!Array.isArray(existingUserIds)) {
                  existingUserIds = [];
                }
                
                // Convert to integers
                existingUserIds = existingUserIds.map(id => parseInt(id));
              } catch (parseErr) {
                console.error('Error parsing user_id:', parseErr);
                existingUserIds = [];
              }

              // Merge new userIds with existing ones (avoid duplicates)
              // userIdArray.forEach(id => {
              //   if (!existingUserIds.includes(id)) {
              //     existingUserIds.push(id);
              //   }
              // });

              const updateQuery = `
                UPDATE contacts 
                SET user_id = ?, 
                    name = ?,
                    contact_no = ?,
                    subject = ?,
                    description = ?,
                    updatedAt = NOW()
                WHERE id = ?
              `;

              const updateValues = [
                JSON.stringify(existingUserIds),
                name,
                contact_no || null,
                subject || null,
                description,
                existingContact.id
              ];

              mysqlcon.query(updateQuery, updateValues, (err, updateResults) => {
                if (err) {
                  console.error('Error updating contact record:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Email sent but failed to update contact record',
                    error: err.message
                  });
                }

                return res.status(200).json({
                  success: true,
                  message: 'Connection request sent successfully (contact updated)',
                  data: {
                    contactId: existingContact.id,
                    institute: institute.instituteName,
                    sentTo: email,
                    sentBy: user.username || `${user.first_name} ${user.last_name}`,
                    recipientName: name,
                    contactNumber: contact_no || null,
                    totalUsers: existingUserIds.length,
                    userIds: existingUserIds
                  }
                });
              });
            } else {
              // Create new contact record
              const contactQuery = `
                INSERT INTO contacts 
                (name, email, contact_no, subject, description, user_id, institute_id, createdAt, updatedAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
              `;

              const contactValues = [
                name,
                email,
                contact_no || null,
                subject || null,
                description,
                userId, 
                instituteId
              ];

              mysqlcon.query(contactQuery, contactValues, (err, contactResults) => {
                if (err) {
                  console.error('Error creating contact record:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Email sent but failed to create contact record',
                    error: err.message
                  });
                }

                return res.status(200).json({
                  success: true,
                  message: 'Connection request sent successfully',
                  data: {
                    contactId: contactResults.insertId,
                    institute: institute.instituteName,
                    sentTo: email,
                    sentBy: user.username || `${user.first_name} ${user.last_name}`,
                    recipientName: name,
                    contactNumber: contact_no || null,
                    userIds: userId
                  }
                });
              });
            }
          });

        } catch (emailError) {
          console.error('Error sending email:', emailError);
          return res.status(500).json({
            success: false,
            message: 'Error sending email',
            error: emailError.message
          });
        }
      });
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};







module.exports = {
  signin,
  signup,
  sendOTP,
  verifyOTP,

  forgetPassword,
  changePassword,
  resetPassword,
updatePassword,


  generateAPIKey,
  getAPIKey,
  removeAPIKey,
  createUser,
  verifyUser,
  getInstituteAndUsers
};
