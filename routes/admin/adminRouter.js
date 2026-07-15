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
 
AdminRouter.use('/auth', AuthRouter);
// AdminRouter.use(routeVerifierJwt);

AdminRouter.use("/dashboard", routeVerifierJwt,authorizeRole(['admin','superadmin']),DashboardRouter);
AdminRouter.use('/adminPage',routeVerifierJwt,authorizeRole(['admin','superadmin']), AdminPageRouter);
AdminRouter.use('/users',routeVerifierJwt,authorizeRole(['admin','superadmin']), UserRouter);
// AdminRouter.use('/institutes',routeVerifierJwt,authorizeRole(['admin']), InstituteRouter);
AdminRouter.use('/institutes', InstituteRouter);
AdminRouter.use('/categories',routeVerifierJwt,authorizeRole(['admin','superadmin']), CategoriesRouter);
AdminRouter.use('/reports',routeVerifierJwt,authorizeRole(['admin','superadmin']), ReportsRouter);
AdminRouter.use("/polls", routeVerifierJwt,authorizeRole(['admin','superadmin']),PollsRouter);
AdminRouter.use("/jobs", routeVerifierJwt,authorizeRole(['admin','superadmin']),jobsRouter);


module.exports = AdminRouter;