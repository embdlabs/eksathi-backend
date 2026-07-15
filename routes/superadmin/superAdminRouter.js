const superAdminRouter=require('express').Router()

const { routeVerifierJwt, authorizeRole } = require('../../service/auth.service')
const createAdminRouter = require('./createAdminRouter')
const supDashboardRouter = require('./supDashboardRouter')
const supInstituteRouter = require('./supInstituteRouter')
const supJobsRouter = require('./supJobsRouter')
const supReportRouter = require('./supReportRouter')
const supUserRouter = require('./supUserRouter')
const supAuthUser = require("./authRouter")

superAdminRouter.use("/dashboard",routeVerifierJwt,authorizeRole(['superadmin']),supDashboardRouter)
superAdminRouter.use("/institute",routeVerifierJwt,authorizeRole(['superadmin']),supInstituteRouter)
// superAdminRouter.use("/createadmins",routeVerifierJwt,authorizeRole(['superadmin']),createAdminRouter)
superAdminRouter.use("/createadmins",createAdminRouter)
superAdminRouter.use("/reports",routeVerifierJwt,authorizeRole(['superadmin']),supReportRouter)
superAdminRouter.use("/user",routeVerifierJwt,authorizeRole(['superadmin']),supUserRouter)
superAdminRouter.use("/job",routeVerifierJwt,authorizeRole(['superadmin']),supJobsRouter)
superAdminRouter.use("/auth",routeVerifierJwt,authorizeRole(['superadmin']),supAuthUser)

module.exports=superAdminRouter