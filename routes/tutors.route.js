const express = require("express");
const router = express.Router();
const tutorController = require("../controllers/tutors.controller")

router.get("/", tutorController.getTutors);
router.post("/", tutorController.registerTutor);
router.put("/:id", tutorController.updateTutor);
router.delete("/:id", tutorController.deleteTutor);
router.post("/verify", tutorController.verifyTutorOTP);
router.get("/get/:id", tutorController.getTutorById);

// Add these routes to your router

router.post('/send-tutor-mail/:tutorId', tutorController.SendTutorConnect);
router.put('/cancel-tutor-request/:tutorId', tutorController.CancelTutorRequest);
router.put('/accept-tutor-request/:tutorId', tutorController.AcceptTutorRequest);
router.put('/reject-tutor-request/:tutorId', tutorController.RejectTutorRequest);
router.get('/connection-status/:tutorId', tutorController.GetConnectionStatus);

module.exports = router;
