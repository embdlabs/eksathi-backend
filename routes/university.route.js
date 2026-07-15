const { getUniversities, getUniversity, createUniversity, createUniversitiesBulk, updateUniversity, deleteUniversity } = require('../controllers/university.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const UniversitiesRouter = require('express').Router();

UniversitiesRouter.get('/', getUniversities);
UniversitiesRouter.get('/:id',routeVerifierJwt, getUniversity);
UniversitiesRouter.post('/', routeVerifierJwt, createUniversity);
UniversitiesRouter.post('/bulk', routeVerifierJwt, createUniversitiesBulk);
UniversitiesRouter.put('/:id', routeVerifierJwt, updateUniversity);
UniversitiesRouter.delete('/:id', routeVerifierJwt, deleteUniversity);

module.exports = UniversitiesRouter;