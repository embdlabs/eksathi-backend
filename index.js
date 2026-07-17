require("dotenv").config();
const { app, http, InitSocket } = require("./socket");
const express = require("express");
const passport = require("./passport");
const session = require("express-session");
const path = require("path");
const PORT = process.env.PORT || 5000;
const cors = require("cors");
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");
const morgan = require("morgan");
require("./passport");
const InstitutesRouterV1 = require("./routes/institutes/institutes");
const MainRouter = require("./routes/mainRoute");
const AdminRoutes = require("./routes/admin/adminRouter");
const superAdminRouter = require("./routes/superadmin/superAdminRouter");
const sequelize = require("./model/connection");
const { logg } = require("./utils/utils");
const chalk = require("chalk");
const { DBMODELS } = require("./models/init-models");
const { signup } = require("./routes/institutes/auth.controller");
const {
  verifyOrCreateUserForGoogleOAuth2,
  routeVerifierJwt,
  verifyJWT,
  createJWT,
} = require("./service/auth.service");
const { mysqlcon } = require("./model/db");
const { transporter } = require("./routes/institutes/department.controller");
const jwt = require("jsonwebtoken");
const { sendNotificationToInstitution } = require("./service/notify");
const ejs = require("ejs");
const sendEmailService = require("./utils/email");
const { default: axios } = require("axios");
require("./controllers/cron/cron");

const endpoint =
  process.env.NODE_ENV === "production"
    ? "https://api.eksathi.com"
    : process.env.NODE_ENV === "test"
      ? "https://testapi.eksathi.com"
      : "http://localhost:5000";

// Init Socket
InitSocket();
require("./model/db");

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://www.eksathi.com",
        "https://eksathi.com",
      ]
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://unrivaled-salamander-c78b0c.netlify.app/",
      ];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.eksathi\.com$/.test(origin)
    ) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
AWS.config.update({ region: "ap-south-1" });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(morgan("short"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: "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",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/uploads", express.static("uploads"));
app.use("/v1", InstitutesRouterV1);
app.use("/app", MainRouter);
app.use("/admin", AdminRoutes);
app.use("/superadmin", superAdminRouter);

app.get("/", (req, res) => {
  res.send("Server is running here");
});

// BUG FIX 1: Removed stray backtick after process.uptime()
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Helper functions ──────────────────────────────────────────────────────────

const getInstitutionIdByDepartmentId = async (departmentId) => {
  const query = `
    SELECT institute_id FROM institute_departments WHERE id = ?
  `;
  const [rows] = await mysqlcon.promise().query(query, [departmentId]);
  return rows.length ? rows[0].institute_id : null;
};

const getInstitutionEmailByDepartmentId = async (departmentId) => {
  const query = `
    SELECT i.email, i.name FROM institute_departments d
    JOIN institutes i ON d.institute_id = i.id
    WHERE d.id = ?
  `;
  const [rows] = await mysqlcon.promise().query(query, [departmentId]);
  if (rows.length) {
    return {
      name: rows[0].name,
      email: rows[0].email,
    };
  }
  return null;
};

// ─── Accept invitation ────────────────────────────────────────────────────────

app.get("/accept-invite", async (req, res) => {
  const { email, department_id, token } = req.query;

  if (!token) {
    return res.status(403).json({
      message: "Invalid request, please send a new reset request again",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.email !== email) {
      return res.status(403).json({
        message: "Invalid token.",
      });
    }

    const updateQuery =
      "UPDATE institute_teachers SET status = 'active' WHERE email = ? AND department_id = ?";
    await mysqlcon.promise().query(updateQuery, [email, department_id]);

    const selectQuery = "SELECT id FROM users WHERE email = ?";
    const [rows] = await mysqlcon.promise().query(selectQuery, [email]);

    if (rows.length > 0) {
      const userId = rows[0].id;
      res.json({
        message: "You have successfully accepted the invitation.",
        userId: userId,
      });
    } else {
      res.status(404).json({
        message: "User not found.",
      });
    }
  } catch (error) {
    if (error == "TokenExpiredError: jwt expired") {
      return res.status(403).send("This link has expired");
    }
    console.error("Error accepting invitation:", error);
    res.status(500).send("Internal server error.");
  }
});

// ─── Reject invitation ────────────────────────────────────────────────────────

app.get("/reject-invite", async (req, res) => {
  const { email, department_id, token } = req.query;

  if (!token) {
    return res.status(403).json({
      message: "Invalid request, Please send new reset request again",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Remove teacher from the department
    const deleteQuery =
      "DELETE FROM institute_teachers WHERE email = ? AND department_id = ?";
    await mysqlcon.promise().query(deleteQuery, [decoded.email, department_id]);

    // Get the institution ID to send a notification
    const institutionId = await getInstitutionIdByDepartmentId(department_id);

    // BUG FIX 2: was "institutionEmail" (undefined) — correct variable is "institution"
    const institution = await getInstitutionEmailByDepartmentId(department_id);

    if (institutionId) {
      const selectQuery = "SELECT id, first_name, last_name FROM users WHERE email = ?";
      const [getData] = await mysqlcon.promise().query(selectQuery, [email]);
      const { id, first_name, last_name } = getData[0];
      const message = `The teacher ${first_name} ${last_name} has rejected the invitation to join your department of institution.`;
      await sendNotificationToInstitution(institutionId, id, message);
    }

    if (institution) {
      const mailConfig = {
        email: institution.email,
      };
      const replacements = {
        name: institution.name,
        subject: "Rejected invitation",
      };
      await sendEmailService.sendTemplatedEmail(
        mailConfig,
        replacements,
        "REJECT_TEACHER_INVITE",
      );
    }

    return res.send("Successfully rejected the invitation");
  } catch (error) {
    if (error == "TokenExpiredError: jwt expired") {
      res.status(503).send("This link is expired");
      return;
    }
    console.error("Error rejecting invitation:", error);
    res.status(500).send("Internal server error.");
  }
});

// ─── OAuth2 ───────────────────────────────────────────────────────────────────

app.get("/oauth2", (req, res, next) => {
  console.log("Starting Google authentication...");
  const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_ID}&redirect_uri=${encodeURIComponent(endpoint + "/oauth2/callback/google")}&scope=profile email`;
  res.status(200).json({ url: authorizationUrl });
});

app.get(
  "/oauth2/callback/google",
  passport.authenticate("google", {
    successRedirect: "/oauth2/callback/google/success",
    failureRedirect: "/oauth2/callback/google/failure",
  }),
);

app.get("/oauth2/callback/google/success", (req, res) => {
  if (!req.user) res.redirect("/oauth2/callback/google/failure");
  console.log("Google Verified", req.user);
  const email = req.user._json.email;
  console.log("Email1:", email);
  const email2 = req.user.emails[0].value;
  console.log("Email2:", email2);

  verifyOrCreateUserForGoogleOAuth2(req.user._json, (err, result) => {
    if (err) {
      console.log(err);
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/failure`,
      );
    }
    return res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/success?token=${result.jwt}`,
    );
  });
});

app.post("/oauth2/authorize", async function (req, res) {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized Access",
      header: req.headers,
    });
  }

  try {
    const verfied = await verifyJWT(token, process.env.JWT_SECRET);
    const user = verfied.data;
    mysqlcon.query(
      `SELECT id, name, email, status FROM institutes WHERE id = ${user.id}`,
      async (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        result[0] = { ...result[0], role: "institute" };
        return res.status(200).json({
          message: "Logged in successfully",
          user: result[0],
          jwt: await createJWT({
            id: user.id,
            email: user.email,
            role: "institute",
          }),
        });
      },
    );
  } catch (err) {
    console.log("jwt err", err);
    res.status(401).json({ message: "Invalid Token", err: err, header: token });
  }
});

app.get("/oauth2/callback/google/failure", (req, res) => {
  console.log("Authentication failed");
  res.send("Error");
});

// ─── Start server ─────────────────────────────────────────────────────────────

http.listen(PORT, () => {
  console.log(`Server is Running over port ${PORT}`);
});

// BUG FIX 3: Was two separate module.exports (second one overwrote the first).
// Merged into a single export so both app and endpoint are available.
module.exports = { app, endpoint };