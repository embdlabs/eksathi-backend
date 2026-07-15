const { getPublicInstitute, postContactUs } = require("./public.controller");
const publicRouter = require("express").Router();

publicRouter.post("/contactus", postContactUs);
module.exports = publicRouter;
