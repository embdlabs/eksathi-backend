const express = require('express');
const ChatRouter = express.Router();
const {
    createEksathiSession,
    sendEksathiMessage,
    getEksathiHistory,
    getTrendingTopics,
    getPlatformStats
} = require('../controllers/chat.controller');

/** Parked until post-MVP — Your Gyani AI bot (peer DMs use /app/message). */
const ENABLE_AI_CHATBOT = false;

const aiChatbotDisabled = (_req, res) =>
  res.status(503).json({
    message: 'AI assistant is temporarily unavailable',
    enabled: false,
  });

if (!ENABLE_AI_CHATBOT) {
  ChatRouter.use(aiChatbotDisabled);
}

// Eksathi.com specific routes (re-enable with ENABLE_AI_CHATBOT = true)
ChatRouter.post('/session', createEksathiSession);
ChatRouter.post('/message', sendEksathiMessage);
ChatRouter.get('/history/:sessionId', getEksathiHistory);
ChatRouter.get('/trends', getTrendingTopics);
ChatRouter.get('/stats', getPlatformStats);

module.exports = ChatRouter;