const { getCategories, createCategory } = require("../controllers/categories.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const CategoriesRouter = require("express").Router();

//=======Categories API=======
CategoriesRouter.post("/", routeVerifierJwt, createCategory);
CategoriesRouter.get("/", getCategories);

module.exports = CategoriesRouter;