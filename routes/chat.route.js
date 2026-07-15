const express = require('express');
const ChatRouter = express.Router();
const {
    createEksathiSession,
    sendEksathiMessage,
    getEksathiHistory,
    getTrendingTopics,
    getPlatformStats
} = require('../controllers/chat.controller');

// Eksathi.com specific routes
ChatRouter.post('/session', createEksathiSession);
ChatRouter.post('/message', sendEksathiMessage);
ChatRouter.get('/history/:sessionId', getEksathiHistory);
ChatRouter.get('/trends', getTrendingTopics);
ChatRouter.get('/stats', getPlatformStats);

module.exports = ChatRouter;