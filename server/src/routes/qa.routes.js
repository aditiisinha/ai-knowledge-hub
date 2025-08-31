const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qa.controller');
const auth = require('../middleware/auth');
const { validateQuestion } = require('../middleware/validate');

// @route   POST /api/qa/ask
// @desc    Ask a question about documents
// @access  Private
router.post('/ask', [auth, validateQuestion], qaController.askQuestion);

// @route   POST /api/qa/chat
// @desc    Start a chat session
// @access  Private
router.post('/chat', auth, qaController.startChat);

// @route   POST /api/qa/chat/:sessionId
// @desc    Send a message in a chat session
// @access  Private
router.post('/chat/:sessionId', [auth, validateQuestion], qaController.chatMessage);

// @route   DELETE /api/qa/chat/:sessionId
// @desc    End a chat session
// @access  Private
router.delete('/chat/:sessionId', auth, qaController.endChat);

// @route   GET /api/qa/suggested-questions
// @desc    Get suggested questions based on user's documents
// @access  Private
router.get('/suggested-questions', auth, qaController.getSuggestedQuestions);

// @route   POST /api/qa/feedback
// @desc    Submit feedback on an answer
// @access  Private
router.post('/feedback', auth, qaController.submitFeedback);

// @route   GET /api/qa/history
// @desc    Get QA history
// @access  Private
router.get('/history', auth, qaController.getQaHistory);

module.exports = router;
