const express = require("express");
const router = express.Router();
const tutorController = require("../controllers/tutors.controller");
const {
  optionalRouteVerifierJwt,
  routeVerifierJwt,
} = require("../service/auth.service");

router.get("/", optionalRouteVerifierJwt, tutorController.getTutors);
router.get("/mine", routeVerifierJwt, tutorController.getMyTutorNeeds);
router.post(
  "/:tutorId/view",
  routeVerifierJwt,
  tutorController.recordTutorNeedView
);
router.post("/", optionalRouteVerifierJwt, tutorController.registerTutor);
router.put("/:id", routeVerifierJwt, tutorController.updateTutor);
router.delete("/:id", routeVerifierJwt, tutorController.deleteTutor);
router.post("/verify", tutorController.verifyTutorOTP);
router.get("/get/:id", tutorController.getTutorById);

router.post(
  "/send-tutor-mail/:tutorId",
  routeVerifierJwt,
  tutorController.SendTutorConnect
);
router.put(
  "/cancel-tutor-request/:tutorId",
  routeVerifierJwt,
  tutorController.CancelTutorRequest
);
router.put(
  "/accept-tutor-request/:tutorId",
  routeVerifierJwt,
  tutorController.AcceptTutorRequest
);
router.put(
  "/reject-tutor-request/:tutorId",
  routeVerifierJwt,
  tutorController.RejectTutorRequest
);
router.get(
  "/connection-status/:tutorId",
  optionalRouteVerifierJwt,
  tutorController.GetConnectionStatus
);

module.exports = router;
