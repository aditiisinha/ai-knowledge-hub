const Document = require('../models/Document');
const Version = require('../models/Version');
const Activity = require('../models/Activity');
const embeddingService = require('../services/embeddings');
const { validationResult } = require('express-validator');

// @desc    Create a new document
// @route   POST /api/documents
// @access  Private
exports.createDocument = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, isPublic = false, tags = [], metadata = {} } = req.body;
  
  try {
    // Create document
    const document = new Document({
      title,
      content,
      owner: req.user.id,
      isPublic,
      tags,
      metadata
    });

    await document.save();

    // Create initial version
    const version = new Version({
      document: document._id,
      versionNumber: 1,
      content,
      changes: 'Initial version',
      createdBy: req.user.id
    });

    await version.save();

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'create_document',
      details: { title, isPublic },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate embeddings in the background
    try {
      await embeddingService.updateDocumentEmbeddings(document._id);
    } catch (embeddingError) {
      console.error('Error generating embeddings:', embeddingError);
      // Don't fail the request if embeddings fail
    }

    res.status(201).json(document);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get all documents (user's documents + public documents)
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', tags } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {
      $or: [
        { owner: req.user.id },
        { isPublic: true }
      ]
    };

    // Add search term to query
    if (search) {
      query.$or.push(
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      );
    }

    // Filter by tags if provided
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagsArray };
    }

    const documents = await Document.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'username email');

    const total = await Document.countDocuments(query);

    // Log activity
    await Activity.log({
      user: req.user.id,
      action: 'list_documents',
      details: { search, tags, page, limit },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      documents,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get all public documents
// @route   GET /api/documents/public
// @access  Public
exports.getPublicDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', tags } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { isPublic: true };

    // Add search term to query
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by tags if provided
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagsArray };
    }

    const documents = await Document.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'username');

    const total = await Document.countDocuments(query);

    res.json({
      documents,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a single document by ID
// @route   GET /api/documents/:id
// @access  Private (unless document is public)
exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('collaborators', 'username email');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access to the document
    if (!document.isPublic && 
        document.owner._id.toString() !== req.user.id && 
        !document.collaborators.some(c => c._id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to access this document' });
    }

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'view_document',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(document);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Update a document
// @route   PUT /api/documents/:id
// @access  Private (document owner or admin)
exports.updateDocument = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, isPublic, tags, metadata } = req.body;
  
  try {
    let document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is the owner or admin
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this document' });
    }

    // Check if content has changed
    const contentChanged = content && content !== document.content;
    
    // Update document fields
    if (title !== undefined) document.title = title;
    if (content !== undefined) document.content = content;
    if (isPublic !== undefined) document.isPublic = isPublic;
    if (tags !== undefined) document.tags = tags;
    if (metadata !== undefined) document.metadata = metadata;

    // If content changed, create a new version
    if (contentChanged) {
      // Get the latest version number
      const latestVersion = await Version.findOne(
        { document: document._id },
        { versionNumber: 1 },
        { sort: { versionNumber: -1 } }
      );

      const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      // Generate a diff or change description (simplified)
      const changes = 'Document content updated';
      
      // Create new version
      const version = new Version({
        document: document._id,
        versionNumber: newVersionNumber,
        content: content,
        changes: changes,
        createdBy: req.user.id
      });

      await version.save();
      document.currentVersion = newVersionNumber;
    }

    document.updatedAt = Date.now();
    await document.save();

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'update_document',
      details: { 
        updatedFields: Object.keys(req.body),
        contentChanged: contentChanged
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Update embeddings if content changed
    if (contentChanged) {
      try {
        await embeddingService.updateDocumentEmbeddings(document._id);
      } catch (embeddingError) {
        console.error('Error updating embeddings:', embeddingError);
        // Don't fail the request if embeddings update fails
      }
    }

    res.json(document);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private (document owner or admin)
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is the owner or admin
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    // Log activity before deletion
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'delete_document',
      details: { title: document.title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await document.remove();

    res.json({ message: 'Document removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Share a document with another user
// @route   POST /api/documents/:id/share
// @access  Private (document owner or admin)
exports.shareDocument = async (req, res, next) => {
  const { userId, permission = 'view' } = req.body;

  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is the owner or admin
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to share this document' });
    }

    // Check if user is trying to share with themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot share with yourself' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if document is already shared with this user
    if (document.collaborators.includes(userId)) {
      return res.status(400).json({ message: 'Document already shared with this user' });
    }

    // Add user to collaborators
    document.collaborators.push(userId);
    await document.save();

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'share_document',
      details: { 
        sharedWith: userId,
        permission: permission
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ 
      message: 'Document shared successfully',
      document: {
        id: document._id,
        title: document.title,
        sharedWith: userId,
        permission: permission
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document or user not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Create a new version of a document
// @route   POST /api/documents/:id/version
// @access  Private (document owner or admin)
exports.createVersion = async (req, res, next) => {
  const { content, changes } = req.body;

  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to create versions
    if (document.owner.toString() !== req.user.id && 
        req.user.role !== 'admin' &&
        !document.collaborators.some(id => id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to create versions of this document' });
    }

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Get the latest version number
    const latestVersion = await Version.findOne(
      { document: document._id },
      { versionNumber: 1 },
      { sort: { versionNumber: -1 } }
    );

    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create new version
    const version = new Version({
      document: document._id,
      versionNumber: newVersionNumber,
      content: content,
      changes: changes || 'No change description provided',
      createdBy: req.user.id
    });

    await version.save();

    // Update document content and version
    document.content = content;
    document.currentVersion = newVersionNumber;
    document.updatedAt = Date.now();
    await document.save();

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'create_version',
      details: { 
        version: newVersionNumber,
        changes: changes || 'No change description provided'
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Update embeddings in the background
    try {
      await embeddingService.updateDocumentEmbeddings(document._id);
    } catch (embeddingError) {
      console.error('Error updating embeddings:', embeddingError);
      // Don't fail the request if embeddings update fails
    }

    res.status(201).json({
      message: 'Version created successfully',
      version: {
        id: version._id,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Get all versions of a document
// @route   GET /api/documents/:id/versions
// @access  Private (document owner or admin)
exports.getVersions = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to view versions
    if (document.owner.toString() !== req.user.id && 
        req.user.role !== 'admin' &&
        !document.collaborators.some(id => id.toString() === req.user.id)) {
      return res.status(403).json({ 
        message: 'Not authorized to view versions of this document' 
      });
    }

    const versions = await Version.find({ document: document._id })
      .sort({ versionNumber: -1 })
      .select('versionNumber changes createdAt createdBy')
      .populate('createdBy', 'username');

    res.json({
      documentId: document._id,
      title: document.title,
      currentVersion: document.currentVersion,
      versions
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Get a specific version of a document
// @route   GET /api/documents/:id/version/:versionId
// @access  Private (document owner or admin)
exports.getVersion = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to view versions
    if (document.owner.toString() !== req.user.id && 
        req.user.role !== 'admin' &&
        !document.collaborators.some(id => id.toString() === req.user.id)) {
      return res.status(403).json({ 
        message: 'Not authorized to view versions of this document' 
      });
    }

    const version = await Version.findOne({
      _id: req.params.versionId,
      document: document._id
    }).populate('createdBy', 'username');

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    res.json({
      documentId: document._id,
      documentTitle: document.title,
      version
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document or version not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Add a tag to a document
// @route   POST /api/documents/:id/tag
// @access  Private (document owner or admin)
exports.addTag = async (req, res, next) => {
  const { tag } = req.body;

  if (!tag) {
    return res.status(400).json({ message: 'Tag is required' });
  }

  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to modify the document
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }

    // Check if tag already exists
    if (document.tags.includes(tag)) {
      return res.status(400).json({ message: 'Tag already exists' });
    }

    // Add tag
    document.tags.push(tag);
    document.updatedAt = Date.now();
    await document.save();

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'add_tag',
      details: { tag },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      message: 'Tag added successfully',
      document: {
        id: document._id,
        title: document.title,
        tags: document.tags
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Remove a tag from a document
// @route   DELETE /api/documents/:id/tag/:tag
// @access  Private (document owner or admin)
exports.removeTag = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to modify the document
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }

    const tagIndex = document.tags.indexOf(req.params.tag);
    
    if (tagIndex === -1) {
      return res.status(400).json({ message: 'Tag not found' });
    }

    // Remove tag
    document.tags.splice(tagIndex, 1);
    document.updatedAt = Date.now();
    await document.save();

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'remove_tag',
      details: { tag: req.params.tag },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      message: 'Tag removed successfully',
      document: {
        id: document._id,
        title: document.title,
        tags: document.tags
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Generate embeddings for a document
// @route   POST /api/documents/:id/embed
// @access  Private (document owner or admin)
exports.generateEmbeddings = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to modify the document
    if (document.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }

    // Generate embeddings
    await embeddingService.updateDocumentEmbeddings(document._id);

    // Refresh the document to get the updated embeddings
    const updatedDoc = await Document.findById(document._id);

    // Log activity
    await Activity.log({
      user: req.user.id,
      document: document._id,
      action: 'generate_embeddings',
      details: { 
        title: document.title,
        embeddingLength: updatedDoc.embeddings ? updatedDoc.embeddings.length : 0
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      message: 'Embeddings generated successfully',
      document: {
        id: updatedDoc._id,
        title: updatedDoc.title,
        hasEmbeddings: updatedDoc.embeddings && updatedDoc.embeddings.length > 0
      }
    });
  } catch (err) {
    console.error('Error in generateEmbeddings:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.status(500).json({ 
      message: 'Error generating embeddings',
      error: err.message 
    });
  }
};
