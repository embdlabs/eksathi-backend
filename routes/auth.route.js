
const { signup, emailAlreadyExist, additionalInfo, signin,jwtLogin, verifyOTP,verifyInstituteOTP, changePassword, forgetPassword, resetPassword, updatePassword, sendOTP,emailOrPhoneAlreadyExist } = require("../controllers/auth.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const AuthRouter = require("express").Router();

//======Auth Routes========
AuthRouter.post("/signup", signup);
AuthRouter.post("/check-email", emailAlreadyExist);
AuthRouter.post("/check-email-phone", emailOrPhoneAlreadyExist);
AuthRouter.post("/signin", signin);
AuthRouter.post("/addiinfo", additionalInfo);
AuthRouter.get("/emaillogin", jwtLogin);

AuthRouter.post("/forget-password", forgetPassword);
AuthRouter.get("/reset-password", resetPassword);
AuthRouter.post("/update-password", updatePassword);

AuthRouter.put("/change-password", routeVerifierJwt, changePassword);
AuthRouter.post("/send-otp", sendOTP);
AuthRouter.post("/verify-otp", verifyOTP);
AuthRouter.post("/verify-institute-otp", verifyInstituteOTP);


module.exports = AuthRouter;
