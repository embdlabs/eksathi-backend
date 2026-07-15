const { routeVerifierJwt } = require("../../service/auth.service");
const { upload } = require("../../utils/upload");
const { postAnswer, getAnswers, updateAnswer } = require("./answers.controller");
const InstitutesRouterV1 = require("express").Router();

//====department controller======
const {
  getDepartments,
  createDepartment,
  createTeacher,
  getTeachers,
  Updatedepartments,
  Deletedepartments,
  Updateteacher,
  Deleteteacher,
  createTeacherProfile,
} = require("./department.controller");
//====Auth Controller Imports=====
const {
    signin,
    signup,
    forgetPassword,
    sendOTP,
    verifyOTP,
    changePassword,
    getAPIKey,
    removeAPIKey,
    generateAPIKey,
    createUser,
    verifyUser,
    getInstituteAndUsers,
    updatePassword

} = require("./auth.controller");
const { verifyAuth } = require("./auth.service");
const { createCategory, getCategories } = require("./categories.controller");
const { postComment, getCommentsByQuestionID, getCommentsByAnswerID, getComments, updateComment } = require("./comments.controller");

//=====  Questions API Controller Imports =======
const { getQuestions, postQuestion, getQuestionsByEmail, getQuestionsByCategories, updateQuestion, getQuestionsByID, getQuestionsBySlug, questionStats } = require("./questions.controller");
const { postReply, getReply, postThreadReply } = require("./replies.controller");
const { searchQuestion, queryQuestion } = require("./search.controller");
const { updateUser } = require("./user.controller");
const { postVote, getVotes } = require("./votes.controller");

//=====  Report API Controller Imports =======

const { getReports, createReport, deleteContent } = require("./reports.controller");
const { instituteOnboarding } = require("./onboarding.controller");
const { createAdmissions, getAdmissions,getAllAdmissions,updateAdmission,
  deleteAdmission,
  postEnrollment ,
  getEnrollments,
  getEnrollmentById,
    getUserEnrollments,
    getEnrollmentStatus,
    updateAdmissionEnrollment,
    getAdmissionById,
    

    
} = require("./admission.controller");

const fakeRoute = (req, res) => {
    return res.status(404).json({ message: "Oops! It's look like you are lost, Contact admin." });
}

//======Home Routes========
InstitutesRouterV1.get("/", fakeRoute);
InstitutesRouterV1.post("/", fakeRoute);
InstitutesRouterV1.put("/", fakeRoute);
InstitutesRouterV1.delete("/", fakeRoute);

//======Auth Routes========
InstitutesRouterV1.post("/signup", signup);
InstitutesRouterV1.post("/signin", signin);
InstitutesRouterV1.post("/createcontact", getInstituteAndUsers);

InstitutesRouterV1.post("/send-otp", sendOTP);
InstitutesRouterV1.post("/verify-otp", verifyOTP);

InstitutesRouterV1.post("/forget-password", forgetPassword);
InstitutesRouterV1.post("/update-password",updatePassword  );
// InstitutesRouterV1.put("/change-password", routeVerifierJwt, changePassword);

InstitutesRouterV1.post("/generate-api-key", routeVerifierJwt, generateAPIKey);
InstitutesRouterV1.get("/get-api-key", routeVerifierJwt, getAPIKey);
InstitutesRouterV1.delete("/remove-api-key", routeVerifierJwt, removeAPIKey);
InstitutesRouterV1.post("/onboarding", routeVerifierJwt, instituteOnboarding);

//=========Admissions================================
InstitutesRouterV1.post('/createadmission',createAdmissions)
InstitutesRouterV1.get('/getadmission/:id',getAdmissions)
InstitutesRouterV1.get('/getalladmission/',getAllAdmissions)

InstitutesRouterV1.get('/getadmissionbyid/:id',getAdmissionById)

InstitutesRouterV1.put('/updateadmission/:admissionId', updateAdmission);
InstitutesRouterV1.put('/updateadmission/:admissionId', updateAdmission);
InstitutesRouterV1.delete('/deleteadmission/:admissionId', deleteAdmission);



InstitutesRouterV1.post('/enrollmentpost/', postEnrollment);
InstitutesRouterV1.post('/enrollstatus/', getEnrollments);
InstitutesRouterV1.get('/getEnrollmentById/:id/', getEnrollmentById);
InstitutesRouterV1.get('/getUserEnrollments/:user_id', getUserEnrollments);
InstitutesRouterV1.get('/:userId/course/:courseId/enrollment-status', getEnrollmentStatus);
InstitutesRouterV1.post('/update-enrollment', updateAdmissionEnrollment);

// InstitutesRouterV1.post('/addwishlist', addWishlist);
// InstitutesRouterV1.put('/removewishlist/:userId/:courseId', removeFromWishlist);
// InstitutesRouterV1.get('/:userId/course/wishlist', getWishlist);


//==========UserRouter================================
InstitutesRouterV1.post("/api/create-user", verifyAuth, createUser);
InstitutesRouterV1.post("/api/verify-user", verifyAuth, verifyUser);
InstitutesRouterV1.put("/api/update-user", verifyAuth, updateUser);

//======Questions API========
InstitutesRouterV1.get('/api/questions', verifyAuth, getQuestions);
InstitutesRouterV1.get('/api/questions/my', verifyAuth, getQuestionsByEmail);
InstitutesRouterV1.get('/api/questions/category', verifyAuth, getQuestionsByCategories);
InstitutesRouterV1.post('/api/questions', verifyAuth, postQuestion);
InstitutesRouterV1.put('/api/questions/:id', verifyAuth, updateQuestion);
InstitutesRouterV1.get('/api/questions/:id', verifyAuth, getQuestionsByID);
InstitutesRouterV1.get('/api/question/:slug', verifyAuth, getQuestionsBySlug);
InstitutesRouterV1.get('/api/question-stats', verifyAuth, questionStats);


//=======Answers API ========
InstitutesRouterV1.post('/api/answer', verifyAuth, postAnswer);
InstitutesRouterV1.get('/api/answer', verifyAuth, getAnswers);
InstitutesRouterV1.put('/api/answers/:id', verifyAuth, updateAnswer);

//======Comments API ========
InstitutesRouterV1.post('/api/comment', verifyAuth, postComment);
InstitutesRouterV1.get('/api/question/comment', verifyAuth, getCommentsByQuestionID); 
InstitutesRouterV1.get('/api/answer/comment', verifyAuth, getCommentsByAnswerID); 
InstitutesRouterV1.get('/api/comment', verifyAuth, getComments); 
InstitutesRouterV1.put('/api/comments/:id', verifyAuth, updateComment);

//======Reply API ========
InstitutesRouterV1.post('/api/thread', verifyAuth, postThreadReply);
InstitutesRouterV1.post('/api/reply', verifyAuth, postReply);
InstitutesRouterV1.get('/api/reply', verifyAuth, getReply);

//=======Votes API========
InstitutesRouterV1.post("/api/vote", verifyAuth, postVote);
InstitutesRouterV1.get('/api/votes/:id', verifyAuth, getVotes);

//=======Search API=======
InstitutesRouterV1.get("/api/search", verifyAuth, searchQuestion);

//=======Query API========
InstitutesRouterV1.get("/api/query", verifyAuth, queryQuestion);

//=======Categories API=======
InstitutesRouterV1.post("/api/categories", verifyAuth, createCategory);
InstitutesRouterV1.get("/api/categories", verifyAuth, getCategories);

//=======Report API=======
InstitutesRouterV1.post("/api/report", verifyAuth, createReport);
InstitutesRouterV1.get("/api/report", verifyAuth, getReports);

//=======Moderation API=======
InstitutesRouterV1.delete('/content/:type/:id', verifyAuth, deleteContent);

//=======departments API======
InstitutesRouterV1.post("/postdepartments", createDepartment);
InstitutesRouterV1.get("/getdepartments/:id", getDepartments);
InstitutesRouterV1.put("/updatedepartment/:id", Updatedepartments);
InstitutesRouterV1.delete("/deletedepartment/:id", Deletedepartments);
//=======Teachers API=======
InstitutesRouterV1.get("/getteachers/:id", getTeachers);
InstitutesRouterV1.post("/postteacher", createTeacher);
InstitutesRouterV1.put("/updateteacher/:id", Updateteacher);
InstitutesRouterV1.delete("/deleteteacher/:id", Deleteteacher);

InstitutesRouterV1.post("/createTeacherProfile", createTeacherProfile);

module.exports = InstitutesRouterV1;