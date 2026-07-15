const { getAllJobs } = require("../../controllers/admin/adminjobs.controller")

const supJobsRouter=require("express").Router()

supJobsRouter.get('/getalljobs',getAllJobs)

module.exports=supJobsRouter