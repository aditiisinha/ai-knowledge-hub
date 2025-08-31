const express = require('express');
const router = express.Router();
const docsController = require('../controllers/docs.controller');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { validateDocument } = require('../middleware/validate');

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
router.post('/', [auth, validateDocument], docsController.createDocument);

// @route   GET /api/documents
// @desc    Get all documents (user's documents + public documents)
// @access  Private
router.get('/', auth, docsController.getDocuments);

// @route   GET /api/documents/public
// @desc    Get all public documents
// @access  Public
router.get('/public', docsController.getPublicDocuments);

// @route   GET /api/documents/:id
// @desc    Get a single document by ID
// @access  Private (unless document is public)
router.get('/:id', auth, docsController.getDocument);

// @route   PUT /api/documents/:id
// @desc    Update a document
// @access  Private (document owner or admin)
router.put('/:id', [auth, validateDocument], docsController.updateDocument);

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private (document owner or admin)
router.delete('/:id', auth, docsController.deleteDocument);

// @route   POST /api/documents/:id/share
// @desc    Share a document with another user
// @access  Private (document owner or admin)
router.post('/:id/share', auth, docsController.shareDocument);

// @route   POST /api/documents/:id/version
// @desc    Create a new version of a document
// @access  Private (document owner or admin)
router.post('/:id/version', auth, docsController.createVersion);

// @route   GET /api/documents/:id/versions
// @desc    Get all versions of a document
// @access  Private (document owner or admin)
router.get('/:id/versions', auth, docsController.getVersions);

// @route   GET /api/documents/:id/version/:versionId
// @desc    Get a specific version of a document
// @access  Private (document owner or admin)
router.get('/:id/version/:versionId', auth, docsController.getVersion);

// @route   POST /api/documents/:id/tag
// @desc    Add a tag to a document
// @access  Private (document owner or admin)
router.post('/:id/tag', auth, docsController.addTag);

// @route   DELETE /api/documents/:id/tag/:tag
// @desc    Remove a tag from a document
// @access  Private (document owner or admin)
router.delete('/:id/tag/:tag', auth, docsController.removeTag);

// @route   POST /api/documents/:id/embed
// @desc    Generate embeddings for a document
// @access  Private (document owner or admin)
router.post('/:id/embed', auth, docsController.generateEmbeddings);

module.exports = router;
