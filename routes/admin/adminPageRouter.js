const AdminPageRouter = require("express").Router();
// const {upload, ImageReduce} = require("../../utils/upload");

const {getAdmin, createAdmin, updateAdmin, deleteAdmin, updatePrivilege} = require("../../controllers/admin/adminPageController");

AdminPageRouter.get("/", getAdmin);
AdminPageRouter.post("/", createAdmin);
AdminPageRouter.put("/edit/:id", updateAdmin);
AdminPageRouter.delete("/delete/:id", deleteAdmin);
AdminPageRouter.put("/update/:id", updatePrivilege);

module.exports = AdminPageRouter;