const AdminRouter = require('express').Router();

const DashboardRouter = require('./dashboardRouter');
const UserRouter = require('./userRouter');
const CategoriesRouter = require('./categoriesRouter');
const InstituteRouter = require('./instituteRouter');
const ReportsRouter = require('./reportRouter');
const AuthRouter = require('./authRouter');
const { routeVerifierJwt, authorizeRole } = require('../../service/auth.service');
const AdminPageRouter = require('./adminPageRouter');
const PollsRouter = require('./PollsRouter');
const jobsRouter = require('./jobsRouter');
const SiteConfigAdminRouter = require('./siteConfigRouter');
 
AdminRouter.use('/auth', AuthRouter);
// AdminRouter.use(routeVerifierJwt);

AdminRouter.use("/dashboard", routeVerifierJwt,authorizeRole(['admin','superadmin']),DashboardRouter);
AdminRouter.use('/adminPage',routeVerifierJwt,authorizeRole(['admin','superadmin']), AdminPageRouter);
AdminRouter.use('/users',routeVerifierJwt,authorizeRole(['admin','superadmin']), UserRouter);
AdminRouter.use('/institutes', routeVerifierJwt, authorizeRole(['admin','superadmin']), InstituteRouter);
AdminRouter.use('/categories',routeVerifierJwt,authorizeRole(['admin','superadmin']), CategoriesRouter);
AdminRouter.use('/reports',routeVerifierJwt,authorizeRole(['admin','superadmin']), ReportsRouter);
AdminRouter.use("/polls", routeVerifierJwt,authorizeRole(['admin','superadmin']),PollsRouter);
AdminRouter.use("/jobs", routeVerifierJwt,authorizeRole(['admin','superadmin']),jobsRouter);
AdminRouter.use(
  "/site-config",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  SiteConfigAdminRouter
);

// Manual trigger: monthly activity summary emails to top active users
AdminRouter.post(
  "/monthly-activity-mail",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const {
        runMonthlyActivitySummary,
      } = require("../../utils/monthlyActivitySummary");
      const result = await runMonthlyActivitySummary();
      return res.status(200).json({
        message: "Monthly activity summary processed",
        ...result,
      });
    } catch (error) {
      console.error("monthly-activity-mail:", error);
      return res.status(500).json({ message: "Failed to send monthly summary" });
    }
  }
);

module.exports = AdminRouter;