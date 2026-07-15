const { getAnswers, postAnswer, updateAnswer, getAnswersById, getTotalAnswer,answeredQuestions } = require("../controllers/answers.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const AnswersRouter = require("express").Router();

//=======Answers API ========
AnswersRouter.post('/', routeVerifierJwt, postAnswer);
AnswersRouter.get('/',routeVerifierJwt, getAnswers);
AnswersRouter.get('/:id',routeVerifierJwt, getAnswersById);
AnswersRouter.put('/:id', routeVerifierJwt, updateAnswer);
AnswersRouter.get('/totalAnswer/:userId',routeVerifierJwt, getTotalAnswer);
AnswersRouter.get('/my/ans',routeVerifierJwt, answeredQuestions);


module.exports = AnswersRouter;