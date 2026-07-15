// const sib = require("sib-api-v3-sdk");
// const client = sib.ApiClient.instance;
// const apiKey = client.authentications["api-key"];
// apiKey.apiKey = process.env.SIB_API_KEY;
// let sendEmailService = function sendSibEmail(receiverEmail, subject, html) {
//   const tranEmailApi = new sib.TransactionalEmailsApi();
//   const sender = {
//     email: process.env.DEFAULT_EMAIL_SENDER || "noreply@eksathi.com",
//     name: process.env.DEFAULT_EMAIL_NAME || "EkSathi",
//   };
//   const reciever = {
//     email: receiverEmail,
//   };
//   return tranEmailApi
//     .sendTransacEmail({
//       sender,
//       to: [reciever],
//       subject: subject,
//       htmlContent: html,
//       params: {
//         role: "frontend",
//       },
//     })
//     .then((res) => {
//       console.log({
//         message: `Email sent successfully with message ID ${res.messageId}`,
//         Email: reciever,
//         subject: subject,
//         htmlContent: html,
//       });
//       return true;
//     })
//     .catch((err) => {
//       console.log({ message: "Email Sending Error", error: err });
//       return false;
//     });
// };

// module.exports = sendEmailService;

// ============AWS EMAIL SERVICE NOT USING SINCE 25 Feb===============
const path = require("path");
const fs = require("fs");
const handlebars = require("handlebars");
var nodemailer = require("nodemailer");
const ejs = require("ejs");
const logg = require("../utils/utils");
const { profile } = require("console");
require("dotenv").config();

//AWS Configration

// const transportOptions = {
//   host: process.env.AWS_SES_ENDPOINT,
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.AWS_SES_USERNAME,
//     pass: process.env.AWS_SES_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
// };

// SMTP Configration
const transportOptions = {
  host: process.env.SMTP_ENDPOINT,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME, // SMTP user
    pass: process.env.SMTP_PASS, // SMTP password
  },
  tls: {
    rejectUnauthorized: false,
  },
};
var transport = nodemailer.createTransport(transportOptions);

let sendEmailService = (toemail, subject, body, fromemail) => {
  var mailOptions = {
    from: `"EkSathi" <${fromemail || "noreplay@eksathi.com"}>`,
    to: toemail,
    envelope: {
      from: `"EkSathi" <${fromemail || "noreplay@eksathi.com"}>`,
      to: `${toemail}`,
    },
    subject: subject,
    html: body,
  };
  transport.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log(info.response);
    }
  });
};

const sendTemplatedEmail = (
  emailConfig,
  replacements,
  emailtemplate,
  fromemail
) => {
  let TemplateFile;
  switch (emailtemplate) {
    case "SIGNUP": // SignUp Email Template
      TemplateFile = "./EmailTemplates/SignUpTemplate.html";
      break;

    case "SERVICE_REGISTRATION": // Register Through Service Email Template
      TemplateFile = "./EmailTemplates/RegisterThroughServiceTemplate.html";
      break;

    case "RESET_PASSWORD": // Reset Password Email Template
      TemplateFile = "./EmailTemplates/ResetPassword.html";
      break;

    case "RESET_PASSWORD_SUCCESS": // Reset Password Successfull Email Template
      TemplateFile = "./EmailTemplates/ResetPasswordSuccess.html";
      break;

    case "SEND_OTP": // Send OTP Email Template
      TemplateFile = "./EmailTemplates/SendOTP.html";
      break;
    case "SEND_TEACHER_INVITE":
      TemplateFile = "./EmailTemplates/SendTeacherInvitation.html";
      break;
    case "REJECT_TEACHER_INVITE":
      TemplateFile = "./EmailTemplates/RejectTeacherInvitaion.html";
      break;
    case "REJECT_JOB":
      TemplateFile = "./EmailTemplates/RejectJobAdmin.html";
      break;

    case "SHORT_LISTED":
      TemplateFile = "./EmailTemplates/ResumeShortlisted.html";
      break;

    default: // Welcome Email Template
      TemplateFile = "./EmailTemplates/SignUpTemplate.html";
      break;
  }
  // SEND CERTIFICATE
  const filePath = path.join(__dirname, TemplateFile);
  const source = fs.readFileSync(filePath, "utf-8").toString();
  const template = handlebars.compile(source);
  const htmlToSend = template(replacements);
  sendEmailService(
    emailConfig.email,
    emailConfig.subject,
    htmlToSend,
    fromemail
  );
  // End Email Sending Service
};

// Dynamic EJS + Send Mail

const sendDynamicTemplatedEmail = async (
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
  careers
) => {
  try {
    // EJS template path
    const filePath = path.join(__dirname, "../views/resume-shortlisted.ejs");

    // Render EJS with data
    const htmlToSend = await ejs.renderFile(filePath, {
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
    });

    // Send Email
    await sendEmailService(receiverEmail, subject, htmlToSend);

    console.log(`✅ Email sent to ${receiverEmail}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending dynamic EJS templated email:", error);
    return false;
  }
};

const candidateRecievedMail = async (
  receiverEmail,
  subject,
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  instituteName
) => {
  try {
    const filePath = path.join(__dirname, "../views/confirm-mail.ejs");

    const htmlToSend = await ejs.renderFile(filePath, {
      candidateName,
      candidateEmail,
      candidatePhone,
      jobTitle,
      instituteName,
    });

    await sendEmailService(receiverEmail, subject, htmlToSend);

    return true;
  } catch (error) {
    console.error("❌ Error sending dynamic EJS templated email:", error);
    return false;
  }
};

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

    await sendEmailService(receiverEmail, subject, htmlToSend);
    await sendEmailService(senderEmail, subject, confirmhtmltosend);

    return true;
  } catch (error) {
    console.error("❌ Error sending dynamic EJS templated email:", error);
    return false;
  }
};

// user = { name, role, email }

const sendWelcomeMail = async (
  email,
  username,
  role,
  profilelink,
  firstName,
  lastname,
  password
) => {
  try {
    const filePath = path.join(__dirname, "../views/welcome-mail.ejs");

    const htmlToSend = await ejs.renderFile(filePath, {
      email,
      username,
      role,
      profilelink,
      firstName,
      lastname,
      password,
    });
    // Subject based on role
    const subject = `Welcome ${role} - Eksathi.com`;
    // console.log("All Email data  is role is +++++++++++ ", role);
    // console.log("subject is ++++++++++++++++++++++++++++  ", subject);
    // Send email
    await sendEmailService(email, subject, htmlToSend);

    return true;
  } catch (error) {
    console.error("Error sending welcome mail:", error);
    return false;
  }
};

const sendInstituteContactMail = async (
  instituteName,
  instituteEmail,
  institutePhone,
  instituteAddress,
  instituteWebsite,
  establishedYear,
  delegateCountry,
  delegateDesignation,
  senderName,
  senderDesignation,
  recipientName,
  contactPerson,
  contactEmail,
  contactPhone,
  expiryDays,
  showSocialLinks,
  facebookUrl,
  linkedinUrl,
  twitterUrl,
  instagramUrl,
  youtubeUrl,
  githubUrl,
  email,
  message
) => {
  try {
    const filePath = path.join(__dirname, "../views/institute-contact.ejs");

    const htmlToSend = await ejs.renderFile(filePath, {
      instituteName,
      instituteEmail,
      institutePhone,
      instituteAddress,
      instituteWebsite,
      establishedYear,
      delegateCountry,
      delegateDesignation,
      senderName,
      senderDesignation,
      recipientName,
      contactPerson,
      contactEmail,
      contactPhone,
      expiryDays,
      showSocialLinks,
      facebookUrl,
      linkedinUrl,
      twitterUrl,
      instagramUrl,
      youtubeUrl,
      githubUrl,
      message,
    });

    // Send email
    await sendEmailService(email, "Institute Contact Request", htmlToSend);

    return true;
  } catch (error) {
    console.error("Error sending institute contact mail:", error);
    return false;
  }
};

const sendJobsEmail = async (email, instituteName, role) => {
  try {
    const filePath = path.join(__dirname, "../views/job-posting.ejs");
    const htmlToSend = await ejs.renderFile(filePath, {
      email,
      instituteName,
      role,
    });
    let subject = `Welcome eksathi ${role}`;
    await sendEmailService(email, subject, htmlToSend);
    return true;
  } catch (error) {
    console.error("Error sending welcome mail:", error);
    return false;
  }
};

const sendDynamicEmail = async (
  email,
  username,
  role,
  message,
  subject,
  template
) => {
  try {
    let filePath;
    if (template == "welcome") {
      filePath = path.join(__dirname, "../views/welcome-mail.ejs");
    } else if (template == "reminder") {
      filePath = path.join(__dirname, "../views/reminder.ejs");
    } else if (template == "update") {
      filePath = path.join(__dirname, "../views/update.ejs");
    } else if (template == "wishes") {
      filePath = path.join(__dirname, "../views/wishes.ejs");
    } else if (template == "announcement") {
      filePath = path.join(__dirname, "../views/announcement.ejs");
    }
    const htmlToSend = await ejs.renderFile(filePath, {
      email,
      username,
      role,
      message,
      subject,
    });
    await sendEmailService(email, subject, htmlToSend);
    return true;
  } catch (error) {
    console.error("Error sending welcome mail:", error);
    return false;
  }
};

module.exports = {
  sendEmailService,
  sendTemplatedEmail,
  sendDynamicTemplatedEmail,
  candidateRecievedMail,
  sendTutorConnectRequest,
  sendWelcomeMail,
  sendInstituteContactMail,
  sendDynamicEmail,
  sendJobsEmail,
};
