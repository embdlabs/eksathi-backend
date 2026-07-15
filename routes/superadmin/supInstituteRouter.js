const supInstituteRouter = require("express").Router();

const {
  getInstitute,
  createInstitute,
  updateInstitute,
  deleteInstitute,
  latestInstitute,
  getInstituteByEmail,
  getAllJobs,
  getJobStats,
  getJobById,
  updateJob,
  deleteJob,
  updateJobStatus,
} = require("../../controllers/admin/instituteController");

supInstituteRouter.get("/", getInstitute);
supInstituteRouter.get("/latest", latestInstitute);
supInstituteRouter.post("/", createInstitute);
supInstituteRouter.put("/edit/:id", updateInstitute);
supInstituteRouter.delete("/delete/:id", deleteInstitute);
supInstituteRouter.get("/getbyemail/", getInstituteByEmail);
// supInstituteRouter.get("/jobs", getAllJobs);

// Get job statistics
supInstituteRouter.get("/jobs/stats", getJobStats);

// Get single job by ID
supInstituteRouter.get("/jobs/:id", getJobById);

// Update job
supInstituteRouter.put("/jobs/:id", updateJob);

// Update job status only
supInstituteRouter.patch("/jobs/:id/status", updateJobStatus);

// Delete job
supInstituteRouter.delete("/jobs/:id", deleteJob);

module.exports = supInstituteRouter;
