const AuthRouter = require("express").Router();
const authController = require("../../controllers/admin/authController")
const { signup,register, login, admin, teacher, student,RecoverPassword,ResetPassword} = require("../../controllers/admin/authController");

AuthRouter.post("/signup", signup)
AuthRouter.post("/register", register);
AuthRouter.post("/login", login);
AuthRouter.post("/recover",RecoverPassword);
AuthRouter.post("/reset/:token",ResetPassword);
AuthRouter.post("/admin/create",authController.verifyToken, authController.authorize(['superadmin']), admin );
AuthRouter.post('/teacher/create',authController.verifyToken, authController.authorize(['superadmin', 'admin']), teacher);
AuthRouter.post('/student/create',authController.verifyToken, authController.authorize(['superadmin','admin','teacher']), student);

module.exports = AuthRouter;
