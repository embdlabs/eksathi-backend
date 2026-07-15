const ReportRouter = require("express").Router();

const {getReport, getQuestionsBySlug, getAnswers, deleteQuestion, deleteAnswer,deleteComment,deleteReply, getJobLocation} = require("../../controllers/admin/reportController");

ReportRouter.get("/", getReport);
ReportRouter.delete("/deletequestion/:id", deleteQuestion);
ReportRouter.delete("/deleteanswer/:id", deleteAnswer);
ReportRouter.delete("/deletecomment/:id", deleteComment);
ReportRouter.delete("/deletereply/:id", deleteReply);
ReportRouter.get("/:slug", getQuestionsBySlug);
ReportRouter.get("/", getAnswers);
// ReportRouter.get("/location", getJobLocation);
module.exports = ReportRouter;