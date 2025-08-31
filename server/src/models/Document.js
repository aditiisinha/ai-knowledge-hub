const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  currentVersion: {
    type: Number,
    default: 1
  },
  embeddings: [{
    type: Number
  }],
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for versions
documentSchema.virtual('versions', {
  ref: 'Version',
  localField: '_id',
  foreignField: 'document',
  justOne: false
});

// Indexes
documentSchema.index({ title: 'text', content: 'text' });
documentSchema.index({ owner: 1 });
documentSchema.index({ isPublic: 1 });

documentSchema.pre('remove', async function(next) {
  // Remove all versions when a document is removed
  await this.model('Version').deleteMany({ document: this._id });
  next();
});

module.exports = mongoose.model('Document', documentSchema);
