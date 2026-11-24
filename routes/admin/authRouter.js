const AuthRouter = require("express").Router();
const authController = require("../../controllers/admin/authController");
const {
  signup,
  register,
  login,
  admin,
  teacher,
  student,
  RecoverPassword,
  ResetPassword,
} = require("../../controllers/admin/authController");
const {
  routeVerifierJwt,
  authorizeRole,
} = require("../../service/auth.service");

AuthRouter.post(
  "/signup",
  routeVerifierJwt,
  authorizeRole(["superadmin"]),
  signup
);
AuthRouter.post(
  "/register",
  routeVerifierJwt,
  authorizeRole(["superadmin"]),
  register
);
AuthRouter.post("/login", login);
AuthRouter.post("/recover", RecoverPassword);
AuthRouter.post("/reset/:token", ResetPassword);
AuthRouter.post(
  "/admin/create",
  authController.verifyToken,
  authController.authorize(["superadmin"]),
  admin
);
AuthRouter.post(
  "/teacher/create",
  authController.verifyToken,
  authController.authorize(["superadmin", "admin"]),
  teacher
);
AuthRouter.post(
  "/student/create",
  authController.verifyToken,
  authController.authorize(["superadmin", "admin", "teacher"]),
  student
);

module.exports = AuthRouter;
