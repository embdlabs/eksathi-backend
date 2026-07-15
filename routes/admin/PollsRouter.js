const PollsRouter=require('express').Router()

const { getAllPolls, createPoll, updatePoll, deletePoll, getNearbyPolls } = require('../../controllers/admin/pollcontroller')

PollsRouter.get('/',getAllPolls)
PollsRouter.post('/',createPoll)
PollsRouter.put('/:id',updatePoll)
PollsRouter.delete('/:id',deletePoll)
PollsRouter.get('/nearby',getNearbyPolls)

module.exports=PollsRouter