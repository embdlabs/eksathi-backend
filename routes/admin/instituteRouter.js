const InstituteRouter = require("express").Router();

const {getInstitute, createInstitute, updateInstitute, deleteInstitute, latestInstitute} = require("../../controllers/admin/instituteController");

InstituteRouter.get("/", getInstitute);
InstituteRouter.get("/latest", latestInstitute)
InstituteRouter.post("/", createInstitute);
InstituteRouter.put("/edit/:id", updateInstitute);
InstituteRouter.delete("/delete/:id", deleteInstitute);

module.exports = InstituteRouter;