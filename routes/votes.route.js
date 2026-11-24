const { getVotes, postVote, getUserVote } = require('../controllers/votes.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const VotesRouter = require('express').Router();

VotesRouter.post('/', routeVerifierJwt, postVote);
// Must be before /:id or "user" is captured as the id param
VotesRouter.get('/user/:id', routeVerifierJwt, getUserVote);
VotesRouter.post('/user/:id', routeVerifierJwt, getUserVote);
// Public vote counts (guest Wall can still see numbers; casting requires JWT above)
VotesRouter.get('/:id', getVotes);

module.exports = VotesRouter;
