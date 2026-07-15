const { getLastNewApplicants, getJobPostsWithApplicationsCount } = require('../controllers/applicants.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const ApplicantRouter = require('express').Router();

ApplicantRouter.get('/new-applicants/:instituteId',  getLastNewApplicants);
ApplicantRouter.get('/count/:instituteId', routeVerifierJwt, getJobPostsWithApplicationsCount);


module.exports = ApplicantRouter;