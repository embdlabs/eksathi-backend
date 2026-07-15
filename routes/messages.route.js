const { getMsg , getMessagesByUserId} = require("../controllers/messages.controller");
const { routeVerifierJwt } = require("../service/auth.service");

const MessageRouter = require("express").Router();

//======Questions API========
MessageRouter.get('/allmsg/:roomId', async (req, res) => {
    const roomId = req.params.roomId; // Extract roomId from the URL

    try {
        // Validate roomId
        if (!roomId) {
            return res.status(400).json({ error: 'Room ID is required' });
        }

        // Fetch messages using the getMsg function
        const messages = await getMsg(roomId); 

        // Send the messages as a JSON response
        res.json(messages); 
    } catch (error) {
        // Log the error for debugging
        console.error('Error fetching messages:', error);

        // Send error response in case of failure
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

MessageRouter.get('/byuser/:userId', getMessagesByUserId);


module.exports = MessageRouter;


