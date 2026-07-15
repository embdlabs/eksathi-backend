const supUserRouter = require("express").Router();

const { check } = require("express-validator");
const { getAllSurveys, getSurveyById, updateSurvey, deleteSurvey, createSurvey, updateStatus } = require("../../controllers/admin/surveyController");
const { submitSurveyResponse, getUserSurveyResponse, getSurveyResponses } = require("../../controllers/admin/surveyResponceController");
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  latestusers,
  dailyactivity,
  getAllLocation,
  getAllSubjectAndClass,

} = require("../../controllers/admin/userController");

supUserRouter.get("/", getUsers);
supUserRouter.get("/latest", latestusers);
supUserRouter.post("/", createUser);
supUserRouter.put("/update/:id", updateUser);
supUserRouter.delete("/delete/:id", deleteUser);
supUserRouter.get("/dailyactivity", dailyactivity);
supUserRouter.get("/location", getAllLocation);
supUserRouter.get("/getallsubjectclass", getAllSubjectAndClass);
supUserRouter.get('/surveys',getAllSurveys);
supUserRouter.patch('/surveys/:id/status',updateStatus);

supUserRouter.post('/surveys', 
  
  [
    check('title', 'Title is required').not().isEmpty(),
    // check('questions', 'At least one question is required').isArray({ min: 1 }),
    check('start_date', 'Start date is required').not().isEmpty(),
    check('end_date', 'End date is required').not().isEmpty()
  ],
  createSurvey
);
supUserRouter.put('/surveys/:id', updateSurvey);
supUserRouter.get('/surveys/:id', getSurveyById);
supUserRouter.delete('/surveys/:id', deleteSurvey);

// User survey routes


// Survey responses

supUserRouter.get('/responses/:survey_id', getSurveyResponses);

// // Get survey statistics (for dashboard)
// router.get('/stats', getSurveyStats);

module.exports = supUserRouter;
