const DashboardRouter = require("express").Router();

const {
  totalUsers,
  newUsers,
  newInstitute,
  totalInstitute,
  lineChart,
  getTeachers,
  totalJobs,
  totalQuestions,
  userTrends,
  getWeeklyActivity,
} = require("./../../controllers/admin/dashboardController");

DashboardRouter.get("/totalusers", totalUsers);
DashboardRouter.get("/newuser", newUsers);
DashboardRouter.get("/newinstitute", newInstitute);
DashboardRouter.get("/totalinstitute", totalInstitute);
DashboardRouter.get("/teachers", getTeachers);
DashboardRouter.get("/totaljobs", totalJobs);
DashboardRouter.get("/totalquestions", totalQuestions);
DashboardRouter.get("/linechart", lineChart);
DashboardRouter.get("/userTrends", userTrends);
DashboardRouter.get("/activityweekly", getWeeklyActivity);

module.exports = DashboardRouter;
