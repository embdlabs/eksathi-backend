const {
  postQuestion,
  getQuestions,
  getQuestionsByUserId,
  getQuestionsByCategories,
  updateQuestion,
  getQuestionsByID,
  getQuestionsBySlug,
  getQuestionsByUser,
  getTrendingQuestions,
  getRelevantQuestions,
  deleteQuestion,
  hideQuestion,
  getRecentQuestions,
  unHideQuestion,
  getFeaturedQuestions,
  getTotalQuestions,
  getSingleQuestion,
} = require("../controllers/questions.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const QuestionRouter = require("express").Router();

//======Questions API========
QuestionRouter.get("/", getQuestions);
QuestionRouter.get("/my", routeVerifierJwt, getQuestionsByUserId);
// QuestionRouter.get('/questions/my', routeVerifierJwt, getQuestionsByEmail);
QuestionRouter.get("/category", routeVerifierJwt, getQuestionsByCategories);
QuestionRouter.post("/", postQuestion);
QuestionRouter.post("/featured", getFeaturedQuestions);
// QuestionRouter.get('/:id', getQuestionsByID);
QuestionRouter.get(
  "/user-questions/:userId/",
  routeVerifierJwt,
  getQuestionsByUser
);
QuestionRouter.post("/trending", routeVerifierJwt, getTrendingQuestions);
QuestionRouter.post("/relevant", routeVerifierJwt, getRelevantQuestions);
QuestionRouter.patch("/hide/:questionId", routeVerifierJwt, hideQuestion);
QuestionRouter.patch("/unhide/:questionId", routeVerifierJwt, unHideQuestion);
QuestionRouter.post("/recent", routeVerifierJwt, getRecentQuestions);
QuestionRouter.get("/total/:userId", routeVerifierJwt, getTotalQuestions);

QuestionRouter.get("/:slug", routeVerifierJwt, getQuestionsBySlug);
QuestionRouter.put("/:id", routeVerifierJwt, updateQuestion);
QuestionRouter.delete("/:questionId", routeVerifierJwt, deleteQuestion);
QuestionRouter.get("/singal/:questionId", getSingleQuestion);

module.exports = QuestionRouter;
