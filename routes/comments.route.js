const { getComments, postComment } = require("../controllers/comments.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const CommentsRouter = require("express").Router();

//======Comments API ========
CommentsRouter.post('/', routeVerifierJwt, postComment);
// CommentsRouter.get('/question/comment', verifyAuth, getCommentsByQuestionID); 
// CommentsRouter.get('/answer/comment', verifyAuth, getCommentsByAnswerID); 
CommentsRouter.get('/',routeVerifierJwt, getComments); 

module.exports = CommentsRouter;