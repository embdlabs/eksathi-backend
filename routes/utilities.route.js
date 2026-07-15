const { getPublicAvatars } = require('../controllers/utilities.controller');

const UtilitiesRouter = require('express').Router();

UtilitiesRouter.get('/avatars', getPublicAvatars);

module.exports = UtilitiesRouter;