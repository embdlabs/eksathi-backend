const {
  getUserProfile,
  getUser,
  updateActivity,
  createUser,
  updateUser,
  updateUserProfile,
  updateUserSocialLinks,
  getUsers,
  getSuggestedExperts,
  getRecentUsers,
  getUserByUsername,
  getProfileCompletion,
  getUserProfession,
  getTeachersData,
  getInstituteData,
  Teachervote,
  Institutevote,
  getGyaniForRating,
  useContactVisibility,
  checkConnectionStatus,
  getTeacherSameLocation,
  getAllTeacher,
  filterByCityStateAndCountry,
  getCities,
  getSubjects,
  filterBySubject,
  getTeachingClasses,
  users,
  SendTutorConect,
  getRecentUsersWithLocation,
  getLength,
  getInstituteLength,
  getUserWithRole
} = require("../controllers/user.controller");
// const {
//   getSuggestedExperts,
// } = require("../controllers/userExperts.controller");
const { routeVerifierJwt } = require("../service/auth.service");
const { upload, ImageReduce } = require("../utils/upload");

const trackActivity = require('../middleware/trackActivity');
const { getInstitute } = require("../controllers/institutes.controller");
const { getUserSurveyResponse, submitSurveyResponse } = require("../controllers/admin/surveyResponceController");
const { getSurveyById, getUserSurveys, getSurveyProfile } = require("../controllers/admin/surveyController");
// const { getConnectionStatus } = require("../service/utilities.service");

const UserRouter = require("express").Router();

//==========UserRouter================================
// UserRouter.post("/create-user", verifyAuth, createUser);
// UserRouter.post("/verify-user", verifyAuth, verifyUser);
// UserRouter.put("/update-user", verifyAuth, updateUser);

// UserRouter.get("/user-profile/:id", routeVerifierJwt, getUserProfile);
UserRouter.get('/survey/survey-profile',routeVerifierJwt, getSurveyProfile);

UserRouter.get('/user-role',getUserWithRole);
UserRouter.get("/getLength",  getLength);
UserRouter.get("/getInstitute",  getInstituteLength);
UserRouter.get("/teachers/all",getAllTeacher)
UserRouter.get("/location",getTeacherSameLocation)

UserRouter.get("/filter",filterByCityStateAndCountry) // after 

UserRouter.get("/city",getCities)
UserRouter.get("/subject",getSubjects)
UserRouter.get("/class",getTeachingClasses)

UserRouter.get("/filter-subject/",filterBySubject)

// UserRouter.post("/send-tutor-mail/",SendTutorConect)


UserRouter.get("/", getUsers);
// Get all Users
UserRouter.get("/all", users);

UserRouter.post("/",routeVerifierJwt, createUser);
// UserRouter.post('/update-activity', trackActivity, updateActivity);
UserRouter.put("/personal/:id", routeVerifierJwt,updateUserProfile);
UserRouter.put("/social/:id",routeVerifierJwt, updateUserSocialLinks);
UserRouter.post("/suggested/experts", getSuggestedExperts);

UserRouter.get("/user-profile/:id",  getUserProfile);
UserRouter.get("/recent/experts", getRecentUsers);
UserRouter.get("/profile/:username", getUserByUsername);
UserRouter.get("/profile-completion/:userId", getProfileCompletion);
UserRouter.get("/profession", getUserProfession);

UserRouter.get("/teachers/nearby/:location", getTeachersData);
UserRouter.get("/institutes/nearby", getInstituteData);


UserRouter.get("/recentlocation/", getRecentUsersWithLocation);



// Get All Institute Data 

UserRouter.get("/institutes/:instituteId", getInstitute);

// UserRouter.post("/teachers/vote/:id",routeVerifierJwt, Teachervote);
UserRouter.post("/teachers/vote/:id", Teachervote);


UserRouter.post("/institutes/vote/:id",routeVerifierJwt, Institutevote);
UserRouter.get("/rateGyani", getGyaniForRating);
UserRouter.put('/:id/contact-visibility', useContactVisibility);
UserRouter.get('/checkConnection', checkConnectionStatus)


UserRouter.put(
  "/:email",
  upload.single("profile_pic"),
  ImageReduce(200, "profile"),
  updateUser
);

UserRouter.put("/:email",routeVerifierJwt,updateUser);

UserRouter.get("/:id", getUser);

UserRouter.get('/surveys', getUserSurveyResponse);

UserRouter.get('/surveys/:id', getSurveyById);
UserRouter.get('/survey/user-survey', routeVerifierJwt ,getUserSurveys);
UserRouter.post('/responses',routeVerifierJwt, submitSurveyResponse);
UserRouter.get('/responses/:survey_id',routeVerifierJwt,getUserSurveyResponse);


module.exports = UserRouter;
