const { searchQuestion, queryQuestion } = require("../controllers/search.controller");
const { routeVerifierJwt } = require('../service/auth.service');
const SearchRouter = require("express").Router();

//=======Search API=======
SearchRouter.get("/", searchQuestion);

//=======Query API========
SearchRouter.get("/query",routeVerifierJwt, queryQuestion);

module.exports = SearchRouter;