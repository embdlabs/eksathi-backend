const supReportRouter = require("express").Router();

const {getReport, getQuestionsBySlug, getAnswers, deleteQuestion, deleteAnswer,deleteComment,deleteReply, getJobLocation} = require("../../controllers/admin/reportController");

supReportRouter.get("/", getReport);
supReportRouter.delete("/deletequestion/:id", deleteQuestion);
supReportRouter.delete("/deleteanswer/:id", deleteAnswer);
supReportRouter.delete("/deletecomment/:id", deleteComment);
supReportRouter.delete("/deletereply/:id", deleteReply);
supReportRouter.get("/:slug", getQuestionsBySlug);
supReportRouter.get("/", getAnswers);
// supReportRouter.get("/location", getJobLocation);
module.exports = supReportRouter;