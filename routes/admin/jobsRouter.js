const { getAllJobs } = require("../../controllers/admin/adminjobs.controller")

const jobsRouter=require("express").Router()

jobsRouter.get('/getalljobs',getAllJobs)

module.exports=jobsRouter