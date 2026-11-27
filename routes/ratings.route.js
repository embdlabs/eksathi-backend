const {
  postUserRating,
  postRatingDirect,
  getProviderReviews,
} = require("../controllers/ratings.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const RatingRouter = require("express").Router();

RatingRouter.get("/reviews/:userId", getProviderReviews);
RatingRouter.patch("/user", routeVerifierJwt, postUserRating);
RatingRouter.patch("/gyani", routeVerifierJwt, postRatingDirect);

module.exports = RatingRouter;
