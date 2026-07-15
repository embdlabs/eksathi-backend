const { postUserRating, postRatingDirect } = require('../controllers/ratings.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const RatingRouter  = require('express').Router();

RatingRouter.patch('/user', routeVerifierJwt, postUserRating);
RatingRouter.patch('/gyani', routeVerifierJwt, postRatingDirect);

postRatingDirect

module.exports = RatingRouter;