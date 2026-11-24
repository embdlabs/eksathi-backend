const {
  getMessagesByUserId,
  getMessagesByRoom,
  deleteChatByRoom,
} = require("../controllers/messages.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const MessageRouter = require("express").Router();

MessageRouter.delete("/room/:roomId", routeVerifierJwt, deleteChatByRoom);
MessageRouter.get("/allmsg/:roomId", routeVerifierJwt, getMessagesByRoom);
MessageRouter.get("/byuser/:userId", routeVerifierJwt, getMessagesByUserId);

module.exports = MessageRouter;
