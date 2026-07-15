const { 
    addExperience, getUserExperiences, updateExperience, deleteExperience, 
    getEducation, getUserEducation, AddEducation, updateEducation, deleteEducation, 
    getCertifications, getUserCertifications, addCertification, updateCertification, deleteCertification, 
    addSkill, getUserSkills, updateSkill, deleteSkill, getSkills,
    addResearch, getResearch, updateResearch, getUserResearch, deleteResearch,
    addAward, getAward, getUserAward, updateAward,deleteAward } = require('../controllers/candidate.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const CandidateRouter = require('express').Router();

CandidateRouter.post('/experiences/:id', routeVerifierJwt, addExperience);
// CandidateRouter.get('/experiences/:id',routeVerifierJwt, getUserExperiences);
CandidateRouter.get('/experiences/:id', getUserExperiences);
CandidateRouter.put('/experiences/:id', routeVerifierJwt, updateExperience);
CandidateRouter.delete('/experiences/:id', routeVerifierJwt, deleteExperience);

CandidateRouter.get('/educations',routeVerifierJwt, getEducation);
// CandidateRouter.get('/educations/:id',routeVerifierJwt, getUserEducation);
CandidateRouter.get('/educations/:id', getUserEducation);
CandidateRouter.post('/educations/:id',routeVerifierJwt, AddEducation);
CandidateRouter.put('/educations/:id', routeVerifierJwt, updateEducation);
CandidateRouter.delete('/educations/:id', routeVerifierJwt, deleteEducation);

CandidateRouter.get('/certifications',routeVerifierJwt, getCertifications);
// CandidateRouter.get('/certifications/:id',routeVerifierJwt, getUserCertifications);
CandidateRouter.get('/certifications/:id', getUserCertifications);
CandidateRouter.post('/certifications/:id', routeVerifierJwt, addCertification);
CandidateRouter.put('/certifications/:id', routeVerifierJwt, updateCertification);
CandidateRouter.delete('/certifications/:id', routeVerifierJwt, deleteCertification);

CandidateRouter.get('/skills',routeVerifierJwt, getSkills);
CandidateRouter.post('/skills/:id', addSkill);
// CandidateRouter.get('/skills/:id',routeVerifierJwt, getUserSkills);
CandidateRouter.get('/skills/:id', getUserSkills);
CandidateRouter.put('/skills/:id', routeVerifierJwt, updateSkill);
CandidateRouter.post('/delete-skill', routeVerifierJwt, deleteSkill);

CandidateRouter.get('/research',routeVerifierJwt, getResearch);
// CandidateRouter.post('/research/:id', routeVerifierJwt, addResearch);
CandidateRouter.post('/research/:id', addResearch);
CandidateRouter.get('/research/:id',routeVerifierJwt, getUserResearch);
CandidateRouter.put('/research/:id', routeVerifierJwt, updateResearch);
CandidateRouter.delete('/research/:id', routeVerifierJwt, deleteResearch);

CandidateRouter.get('/award',routeVerifierJwt,getAward);
CandidateRouter.post('/award/:id',routeVerifierJwt, addAward);
// CandidateRouter.get('/award/:id',routeVerifierJwt,getUserAward)
CandidateRouter.get('/award/:id',getUserAward)
CandidateRouter.put('/award/:id',routeVerifierJwt,updateAward)
CandidateRouter.delete('/award/:id',routeVerifierJwt,deleteAward)

// CandidateRouter.get('/profile/:username', getUserProfile);

module.exports = CandidateRouter;