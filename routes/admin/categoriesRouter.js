const CategoriesRouter = require("express").Router();

const { createCategory, getCategories, updateCategories, deleteCategories, getJobLocation, CreateGeocoder, createPollData, getPollData, deletePollData} = require("../../controllers/admin/categoriesController");

CategoriesRouter.post("/", createCategory);
CategoriesRouter.get("/", getCategories);
CategoriesRouter.put("/edit/:id", updateCategories);
CategoriesRouter.delete("/delete/:id", deleteCategories);

module.exports = CategoriesRouter;