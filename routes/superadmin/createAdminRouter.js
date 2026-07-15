const createAdminRouter = require("express").Router();
// const {upload, ImageReduce} = require("../../utils/upload");

const {getAdmin, createAdmin, updateAdmin, deleteAdmin, updatePrivilege,getAdminById,getPrivilege} = require("../../controllers/admin/adminPageController");
const { sendMailByRole } = require("../../controllers/admin/sendMail");

createAdminRouter.get("/", getAdmin);
createAdminRouter.get("/get/:id", getAdminById);
createAdminRouter.get("/get-privilege/:id", getPrivilege);
createAdminRouter.post("/", createAdmin);
createAdminRouter.put("/edit/:id", updateAdmin);
createAdminRouter.delete("/delete/:id", deleteAdmin);
createAdminRouter.put("/update/:id", updatePrivilege);
createAdminRouter.post("/send-mail", sendMailByRole);

module.exports = createAdminRouter;