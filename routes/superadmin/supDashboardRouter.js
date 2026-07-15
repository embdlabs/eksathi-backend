const supDashboardRouter = require("express").Router();

const {totalUsers,newUsers,newInstitute,totalInstitute,lineChart, getTeachers, totalJobs, totalQuestions, totalComments, totalAnswers, totalEvents,
    getUserActivityStatus,getTutors,userTrends,getWeeklyActivity
} = require('../../controllers/admin/dashboardController');

supDashboardRouter.get("/totalusers", totalUsers); //done
supDashboardRouter.get("/newuser", newUsers);
supDashboardRouter.get("/newinstitute", newInstitute);
supDashboardRouter.get("/totalinstitute", totalInstitute); //done
supDashboardRouter.get("/totalquestions", totalQuestions); //done
supDashboardRouter.get("/totalcomments", totalComments); //done
supDashboardRouter.get("/totalanswers", totalAnswers); //done
supDashboardRouter.get("/totalevents", totalEvents); //done
supDashboardRouter.get("/totaltutor", getTutors); //done
supDashboardRouter.get("/activityperhour", getUserActivityStatus); //done
supDashboardRouter.get("/activityweekly", getWeeklyActivity); //done
//get teachers data
supDashboardRouter.get("/teachers",getTeachers)
supDashboardRouter.get("/totaljobs",totalJobs); //done

supDashboardRouter.get("/linechart", lineChart);
supDashboardRouter.get("/userTrends", userTrends);

module.exports = supDashboardRouter;