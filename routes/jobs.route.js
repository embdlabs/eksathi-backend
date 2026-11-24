const {
  getAppliedJobs,
  getallJobs,
  addToWishlist,
  removeWishList,
  getWishlistsJobs,
  getJobs,
  getTotalJobs,
  getJob,
  addJob,
  updateJob,
  deleteJob,
  getJobCategories,
  getJobCategory,
  addJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getJobDescriptionsByCategory,
  getJobApplication,
  getAllJobApplications,
  getAllJobApplicationsByJobDescriptions,
  createApplication,
  getAllJobApplicationsByInstitute,
  getJobBySlug,
  updateApplicationStatus,
  getActiveJobs,
  getAllJobApplicationsByApplicantId,
  getInactiveJobs,
  Approvejob,
  Rejectjob,
  getAllJobDescriptions,
  updateJobStatus,
  SearchJob,
  SearchTutorJob,
} = require("../controllers/jobs.controller");
const { routeVerifierJwt, authorizeRole } = require("../service/auth.service");

const JobsRouter = require("express").Router();

JobsRouter.get("/getjobs", routeVerifierJwt, getJobs);
JobsRouter.get("/getJobsById/:id", routeVerifierJwt, getJob);

JobsRouter.get("/post", getJobs);
JobsRouter.get("/totalJobs", getTotalJobs);
JobsRouter.get("/allJobs", getallJobs);

// JobsRouter.get('/active', getActiveJobs);
JobsRouter.get(
  "/inactive",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  getInactiveJobs
);
JobsRouter.get("/details/:slug", getJobBySlug);
JobsRouter.get("/post/:id", routeVerifierJwt, getJob);
JobsRouter.post(
  "/post",
  routeVerifierJwt,
  authorizeRole(["institute", "admin", "superadmin"]),
  addJob
);
JobsRouter.put(
  "/put/:id",
  routeVerifierJwt,
  authorizeRole(["institute", "admin", "superadmin"]),
  updateJob
);
JobsRouter.delete(
  "/delete/:id",
  routeVerifierJwt,
  authorizeRole(["institute", "admin", "superadmin"]),
  deleteJob
);
JobsRouter.get("/categorized", getJobDescriptionsByCategory);
JobsRouter.put(
  "/approve-job/:id",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  Approvejob
);
JobsRouter.put(
  "/reject-job/:id",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  Rejectjob
);

JobsRouter.get("/categories", routeVerifierJwt, getJobCategories);
JobsRouter.get("/categories/:id", routeVerifierJwt, getJobCategory);

JobsRouter.post(
  "/category",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  addJobCategory
);
JobsRouter.put(
  "/categories/:id",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  updateJobCategory
);
JobsRouter.delete(
  "/categories/:id",
  routeVerifierJwt,
  authorizeRole(["admin", "superadmin"]),
  deleteJobCategory
);

JobsRouter.get("/applications", routeVerifierJwt, getAllJobApplications);
JobsRouter.get(
  "/applications/:jobDescriptionId",
  routeVerifierJwt,
  getAllJobApplicationsByJobDescriptions,
);
JobsRouter.get(
  "/institute/applications/:instituteId",
  routeVerifierJwt,
  getAllJobApplicationsByInstitute,
);
JobsRouter.get(
  "/application/:applicationId",
  routeVerifierJwt,
  getJobApplication,
);
JobsRouter.put(
  "/application/status/:applicationId",
  routeVerifierJwt,
  authorizeRole(["institute", "admin", "superadmin"]),
  updateApplicationStatus,
);
JobsRouter.post("/apply", routeVerifierJwt, createApplication);
JobsRouter.post("/addwishlist", routeVerifierJwt, addToWishlist);
JobsRouter.put(
  "/removewishlist/:userId/:jobId",
  routeVerifierJwt,
  removeWishList,
);

JobsRouter.get(
  "/applied/:applicantId",
  routeVerifierJwt,
  getAllJobApplicationsByApplicantId
);
JobsRouter.get(
  "/:userId/job/:jobId/application-status",
  routeVerifierJwt,
  getAppliedJobs
);
JobsRouter.get(
  "/:userId/job/wishlist",
  routeVerifierJwt,
  getWishlistsJobs
);

JobsRouter.put(
  "/update/:id",
  routeVerifierJwt,
  authorizeRole(["institute", "admin", "superadmin"]),
  updateJobStatus
);
JobsRouter.get("/search", SearchJob);
JobsRouter.get("/tutor-search", SearchTutorJob);

module.exports = JobsRouter;
