const { getAnswers, postAnswer, updateAnswer, getAnswersById, getTotalAnswer,answeredQuestions } = require("../controllers/answers.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const AnswersRouter = require("express").Router();

//=======Answers API ========
AnswersRouter.post('/', routeVerifierJwt, postAnswer);
AnswersRouter.get('/',routeVerifierJwt, getAnswers);
// Public reads first (before /:id) — public profile Answers tab for guests
AnswersRouter.get('/my/ans', answeredQuestions);
AnswersRouter.get('/totalAnswer/:userId', getTotalAnswer);
AnswersRouter.get('/:id',routeVerifierJwt, getAnswersById);
AnswersRouter.put('/:id', routeVerifierJwt, updateAnswer);


module.exports = AnswersRouter;