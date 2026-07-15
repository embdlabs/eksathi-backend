// When an institute requests an API key, 
// generate a unique API key for them and 
// insert it into the api_credentials table

const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { mysqlcon } = require('../model/db');
const { log } = require('console');

let secretKey = process.env.JWT_SECRET_INSTITUTE;

// INUMS
const inum = Object.freeze({
  IDLE: "idle",
  ERROR: "error",
});

const generateSecret = () => {
  return crypto.randomBytes(32).toString('hex');
}

const generateToken = (instituteId, secret) => {
  const token = jwt.sign({ instituteId }, secret);
  return token;
}

const generateApiKey = () => {
  // Generate a random 32-character string
  const apiKey = crypto.randomBytes(16).toString('hex');
  return apiKey;
};

const createApiKey = (instituteId, secret, token, alias) => {
  const apiKey = generateApiKey();
  const createdAt = new Date();

  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO api_credentials (institute_id, api_key, api_secret, api_token, createdAt${alias ? `, alias` : ''}) VALUES (?, ?, ?, ?, ?${alias ? `, ?` : ''})`;
    const values = [instituteId, apiKey, secret, token, createdAt, alias];
    console.log("Data: ", values);
    mysqlcon.query(sql, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(apiKey);
      }
    });
  });
};


// When an institute makes an API request, ensure that they 
// provide a valid API key and that it corresponds to their institute ID

const authenticateApiKey = (apiKey, instituteId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) AS count FROM api_credentials WHERE api_key = ? AND institute_id = ?';
    const values = [apiKey, instituteId];

    mysqlcon.query(sql, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        const count = results[0].count;
        resolve(count === 1);
      }
    });
  });
};

const createUsername = () => {
  const username = `eks_institute_${Math.floor(Math.random() * 100000)}`;
  return username;
}

const createUsernameForUser = () => {
  const username = `user${Date.now()}`;
  return username;
}
const createUsernameForAdmin=()=>{
  const username=`admin${Date.now()}`
  return username
}

// Create JWT
async function createJWT(data) {
  return jwt.sign(
    {
      data: data,
    },
    process.env.JWT_SECRET,
    { expiresIn: 60 * 60 * 24 * 20 }
  );
}

//ValidateJWT
async function verifyJWT(token, secret) {
  return jwt.verify(token, secret);
}

// Verify API KEY
const verifyRoute = (apiKey) => {
  console.log('Verifying API KEY: ' + apiKey);
  try {
    return new Promise((resolve, reject) => {
      if (!apiKey) {
        reject("Error: Invalid API Key or API Key is required");
      } else {
        let sql = `SELECT ins.id as instituteId, ins.auth_verification_path as path, cred.api_key as apiKey, cred.api_secret as apiSecret, cred.api_token as apiToken FROM institutes as ins INNER JOIN api_credentials as cred ON ins.id=cred.institute_id WHERE cred.api_key = '${apiKey}'`;
        mysqlcon.query(sql, (error, results) => {
          if (error) {
            reject(error);
          } else {
            let credentials = results[0];
            // console.log("Verifying credentials: ", results);
            axios.get(credentials.path)
              .then((response) => {
                // console.log(response.data);
                if (response.data.apiKey === credentials.apiKey && response.data.apiSecret === credentials.apiSecret && response.data.apiToken === credentials.apiToken) {
                  resolve(response.data);
                } else {
                  reject("Error: Invalid credentials");
                }
              })
              .catch((error) => {
                console.log(error);
                reject(error);
              })
          }
        });
      }
    })
  } catch (error) {
    return console.log(error);
  }
}; //  

// Route Verify
const verifyAuth = async (req, res, next) => {
  // let token = req.headers.authorization;
  // let secret = req.headers['x-api-secret'];
  let apiKey = req.headers['x-api-key'];

  try {

    const creds = await verifyRoute(apiKey);
    // console.log("Credentials : ", creds);

    if (creds) {
      let token = creds.apiToken.replace("Bearer ", "");
      let secret = creds.apiSecret;
      try {
        const verfied = await verifyJWT(token, secret);
        req.instituteId = verfied.instituteId;
        mysqlcon.query(
          `SELECT ins.* FROM institutes as ins INNER JOIN api_credentials as apic ON ins.id=apic.institute_id WHERE ins.id=${verfied.instituteId} AND apic.api_key = '${apiKey}'`,
          (err, result) => {
            if (err) {
              console.log(err);
              return res.status(500).json({ message: "Internal Server Error" });
            }
            console.log("Verified Result : ", result);
            if (result.length) {
              req.institute = result[0];
              next();
            } else {
              return res.status(401).json({ message: "Access Denied" });
            }
          }
        );
      } catch (err) {
        console.log('jwt err', err);
        res
          .status(498)
          .json({ message: "Invalid Token", err: err, header: token });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(503).json({ message: "Service Unavailable" });
  }

  // if (!token) {
  //   return res.status(404).json({
  //     message: "Token Not Found",
  //     header: req.headers,
  //   });
  // } else if (!secret || !apiKey) {
  //   return res.status(409).json({
  //     message: "API Key and Secret is MANDATORY",
  //     header: req.headers,
  //   });
  // } else {
  //   token = token.replace("Bearer ", "");

  // }
};

// Route Verify
const routeVerifierJwt = async (req, res, next) => {
  let token = req.headers.authorization;
  // console.log("Route Verifier: Body: ", req.body);
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized Access",
      header: req.headers,
    });
  } else {
    token = token.replace("Bearer ", "");
    try {
      const verfied = await verifyJWT(token, process.env.JWT_SECRET);
      req.user = verfied.data;
      // console.log("data :",req.user);
      next();
    } catch (err) {
      console.log('jwt err', err);
      res
        .status(401)
        .json({ message: "Invalid Token", err: err, header: token });
    }
  }
};
const authorizeRole=(roles)=>{
  console.log("Roles is ",roles)
  return(req,res,next)=>{
    if(!roles.includes(req.user.role)){
      return res.status(409).send("Access denied")
    }
    next()
  }
}

function generateOTP() {
  const length = 6; // Number of digits in the OTP code
  const chars = '0123456789'; // Possible characters in the OTP code
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randomIndex);
  }

  return code;
}

function createPasswordForUser() {
  const length = 8; // Number of digits in the password.
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTWXYZ!@#$%&'; // Possible characters in the password
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars.charAt(randomIndex);
  }

  return password;
}

function verifyOrCreateUserForGoogleOAuth2(data, cb) {
  const { name, email } = data;
  console.log("data: ",data)

  //Generate Username
  const username = createUsername();
  console.log("Username : ",username)

  const insertQuery = `INSERT INTO institutes (name, email, username, status) VALUES (?, ?, ?, ?)`;
  const values = [name, email, username, "Onboarding"];
  try {
    mysqlcon.query(`SELECT id FROM institutes WHERE email = ?`, [email], async (err, results) => {
      if (err) {
        console.error(err);
        return cb(err);
      }
      else {
        if (results.length) {
          let user = {
            id: results[0].id,
            email
          };
          let jwt = await createJWT({
            id: results[0].id,
            email,
          })
          return cb(null, {
            user, jwt, isNewUser: false
          });

        } else {
          mysqlcon.query(insertQuery, values, async (err, result) => {
            if (err) {
              console.error(err);
              return cb(err);
            } else {
              let userId = result.insertId;
              let user = {
                id: result.insertId,
                email,
                role: 'institute'
              };
              let jwt = await createJWT({
                id: userId,
                email,
                role: 'institute',
              })
              return cb(null, {
                user, jwt, isNewUser: true
              });
            }
          });
        }
      }
    });

  } catch (err) {
    return cb(err);
  }
}


module.exports = {
  // generateSecret,
  // generateToken,
  // generateApiKey,
  // createApiKey,
  // authenticateApiKey,
  createUsername,
  // verifyAuth,
  createUsernameForUser,
  createUsernameForAdmin,
  inum,
  verifyJWT,
  createJWT,
  routeVerifierJwt,
  generateOTP,
  createPasswordForUser,
  verifyOrCreateUserForGoogleOAuth2,
  authorizeRole,
};