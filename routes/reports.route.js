const { createReport, getReports, deleteContent } = require("../controllers/reports.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const ReportRouter = require("express").Router();

ReportRouter.post('/', routeVerifierJwt, createReport);
ReportRouter.delete('/action/delete', routeVerifierJwt, deleteContent);
ReportRouter.get('/:userId', routeVerifierJwt, getReports);

module.exports = ReportRouter;