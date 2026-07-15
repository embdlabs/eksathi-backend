const { getVotes, postVote, getUserVote } = require('../controllers/votes.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const VotesRouter = require('express').Router();

VotesRouter.get('/:id',routeVerifierJwt, getVotes);
VotesRouter.post('/', routeVerifierJwt, postVote);
VotesRouter.post('/user/:id', routeVerifierJwt, getUserVote);


module.exports = VotesRouter;