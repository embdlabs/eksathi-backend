const { ResetPassword, VerifyEmail } = require("../../controllers/admin/authSuperaAdminController");

const supAuthRouter = require("express").Router();


supAuthRouter.put("/reset-password",ResetPassword)
supAuthRouter.post("/verify-email",VerifyEmail)
// supReportRouter.get("/location", getJobLocation);
module.exports = supAuthRouter;