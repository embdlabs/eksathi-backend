const { postReply, getReply } = require("../controllers/replies.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const RepliesRouter = require("express").Router();

//======Reply API ========
// RepliesRouter.post('/thread', verifyAuth, postThreadReply);
RepliesRouter.post('/', routeVerifierJwt, postReply);
RepliesRouter.get('/',routeVerifierJwt, getReply);

module.exports = RepliesRouter;
