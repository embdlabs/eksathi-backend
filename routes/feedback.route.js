// routes/feedbackRoutes.js
const FeedbackRouter = require('express').Router();

const {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  getFeedbackStats,
  getFeedbackByUserId
} = require('../controllers/feedback.controller');

// Public route - Create feedback (authenticated users)
FeedbackRouter.post('', createFeedback);

// User route - Get feedback by user_id (for users to see their own feedback)
FeedbackRouter.get('/user/:user_id', getFeedbackByUserId);

// Admin routes - Get all feedback with filters
FeedbackRouter.get('', getAllFeedback);

// Admin routes - Get feedback statistics
FeedbackRouter.get('/stats', getFeedbackStats);

// Admin routes - Get specific feedback by id
FeedbackRouter.get('/:id', getFeedbackById);

// Admin routes - Update feedback status
FeedbackRouter.put('/:id/status', updateFeedbackStatus);

// Admin routes - Delete feedback
FeedbackRouter.delete('/:id', deleteFeedback);

module.exports = FeedbackRouter;