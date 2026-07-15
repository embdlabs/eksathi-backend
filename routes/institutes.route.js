const {
  getInstitutes,
  getProfileCompletion,
  getInstitute,
  createInstituteProfile,
  getInstituteProfile,
  updateInstituteProfile,
  deleteInstituteProfile,
  onboardingInstitute,
  //   ContactInstitute,
  AddContactInstitute,
  getContactInstitute,
  ReplyInstituteContact,
  getUserContactDetails,
  sendMailByInstitute,
  searchTeachersAndProfessionals,
  getInstituteWithPagination,
} = require("../controllers/institutes.controller");
const { routeVerifierJwt } = require("../service/auth.service");
const { getContacts } = require("./institutes/admission.controller");

const InstituteRouter = require("express").Router();

InstituteRouter.get("/", getInstitutes);
InstituteRouter.get(
  "/getInstitute",
  getInstituteWithPagination,
);
InstituteRouter.get(
  "/profile/:instituteId",
  routeVerifierJwt,
  getInstituteProfile,
);
InstituteRouter.post(
  "/profile/:instituteId",
  routeVerifierJwt,
  createInstituteProfile,
);
InstituteRouter.put(
  "/profile/:instituteId",
  routeVerifierJwt,
  updateInstituteProfile,
);
InstituteRouter.delete(
  "/profile/:instituteId",
  routeVerifierJwt,
  deleteInstituteProfile,
);
InstituteRouter.get("/profile-completion/:userId", getProfileCompletion);

InstituteRouter.post("/onboarding/:instituteId", onboardingInstitute);

InstituteRouter.get("/:instituteId", getInstitute);

InstituteRouter.post("/addcontact", routeVerifierJwt, AddContactInstitute);
InstituteRouter.get("/getallcontact/:institute_id", getContacts);

InstituteRouter.get("/getcontact/:id", routeVerifierJwt, getContactInstitute);
InstituteRouter.get(
  "/alluserdetails/:id",
  routeVerifierJwt,
  getUserContactDetails,
);
InstituteRouter.post("/reply", routeVerifierJwt, ReplyInstituteContact);
InstituteRouter.post("/send-mail", routeVerifierJwt, sendMailByInstitute);
InstituteRouter.get(
  "/search/teachers-professionals",
  searchTeachersAndProfessionals,
);


module.exports = InstituteRouter;
