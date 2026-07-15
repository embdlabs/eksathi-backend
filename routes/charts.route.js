const {
    getJobApplicationStatusByInstitute,
    getApplicationsStats,
    getJobAppliedbyStatus,
  } = require("../controllers/charts.controller");
  const { routeVerifierJwt } = require("../service/auth.service");
  
  const ChartRouter = require("express").Router();
  
  ChartRouter.get(
    "/job-applications/institute/:instituteId",
    getJobApplicationStatusByInstitute
  );
  ChartRouter.get(
    "/job-applications-stats/institute/:instituteId",
    getApplicationsStats
  );
  ChartRouter.get(
    "/:status/institute/:instituteId",
    routeVerifierJwt,
    getJobAppliedbyStatus
  );
  
  module.exports = ChartRouter;
  