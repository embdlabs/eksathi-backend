const DashboardRouter = require("express").Router();

const {totalUsers,newUsers,newInstitute,totalInstitute,lineChart, getTeachers, totalJobs} = require('./../../controllers/admin/dashboardController');

DashboardRouter.get("/totalusers", totalUsers);
DashboardRouter.get("/newuser", newUsers);
DashboardRouter.get("/newinstitute", newInstitute);
DashboardRouter.get("/totalinstitute", totalInstitute);
//get teachers data
DashboardRouter.get("/teachers",getTeachers)
DashboardRouter.get("/totaljobs",totalJobs)

DashboardRouter.get("/linechart", lineChart);

module.exports = DashboardRouter;