const { getTags, getAllTags } = require('../controllers/tags.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const TagRouter = require('express').Router();

TagRouter.get('/:id', getTags);
TagRouter.get('/', getAllTags);

module.exports = TagRouter;