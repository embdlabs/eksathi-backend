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
const { routeVerifierJwt } = require("../service/auth.service");

const JobsRouter = require("express").Router();

JobsRouter.get("/getjobs", routeVerifierJwt, getJobs);
JobsRouter.get("/getJobsById/:id", routeVerifierJwt, getJob);

JobsRouter.get("/post", getJobs);
JobsRouter.get("/totalJobs", getTotalJobs);
JobsRouter.get("/allJobs", getallJobs);

// JobsRouter.get('/active', getActiveJobs);
JobsRouter.get("/inactive", routeVerifierJwt, getInactiveJobs);
JobsRouter.get("/details/:slug", getJobBySlug);
JobsRouter.get("/post/:id", routeVerifierJwt, getJob);
// JobsRouter.post('/post', routeVerifierJwt, addJob);
JobsRouter.post("/post", addJob);
JobsRouter.put("/put/:id", routeVerifierJwt, updateJob);
JobsRouter.delete("/delete/:id", routeVerifierJwt, deleteJob);
JobsRouter.get("/categorized", getJobDescriptionsByCategory);
JobsRouter.put("/approve-job/:id", routeVerifierJwt, Approvejob);
JobsRouter.put("/reject-job/:id", routeVerifierJwt, Rejectjob);

JobsRouter.get("/categories", routeVerifierJwt, getJobCategories);
JobsRouter.get("/categories/:id", routeVerifierJwt, getJobCategory);

JobsRouter.post("/category", addJobCategory);

JobsRouter.post("/category", routeVerifierJwt, addJobCategory);
JobsRouter.put("/categories/:id", routeVerifierJwt, updateJobCategory);
JobsRouter.delete("/categories/:id", routeVerifierJwt, deleteJobCategory);

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
  updateApplicationStatus,
);
JobsRouter.post("/apply", routeVerifierJwt, createApplication);
JobsRouter.post("/addwishlist", routeVerifierJwt, addToWishlist);
JobsRouter.put(
  "/removewishlist/:userId/:jobId",
  routeVerifierJwt,
  removeWishList,
);

JobsRouter.get("/applied/:applicantId", getAllJobApplicationsByApplicantId);
JobsRouter.get("/:userId/job/:jobId/application-status", getAppliedJobs);
JobsRouter.get("/:userId/job/wishlist", getWishlistsJobs);

JobsRouter.put("/update/:id", routeVerifierJwt, updateJobStatus);
JobsRouter.get("/search", SearchJob);
JobsRouter.get("/tutor-search", SearchTutorJob);

module.exports = JobsRouter;
