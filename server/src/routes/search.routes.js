const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const auth = require('../middleware/auth');
const { validateSearchQuery } = require('../middleware/validate');

// @route   GET /api/search
// @desc    Search across documents
// @access  Private
router.get('/', [auth, validateSearchQuery], searchController.search);

// @route   GET /api/search/semantic
// @desc    Semantic search using embeddings
// @access  Private
router.get('/semantic', [auth, validateSearchQuery], searchController.semanticSearch);

// @route   GET /api/search/chat
// @desc    Chat with your documents
// @access  Private
router.get('/chat', [auth, validateSearchQuery], searchController.chatWithDocuments);

// @route   GET /api/search/suggestions
// @desc    Get search suggestions
// @access  Private
router.get('/suggestions', auth, searchController.getSearchSuggestions);

// @route   GET /api/search/history
// @desc    Get search history
// @access  Private
router.get('/history', auth, searchController.getSearchHistory);

// @route   POST /api/search/feedback
// @desc    Provide feedback on search results
// @access  Private
router.post('/feedback', auth, searchController.submitSearchFeedback);

module.exports = router;
