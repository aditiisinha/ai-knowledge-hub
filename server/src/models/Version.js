const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  changes: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure version number is unique per document
versionSchema.index({ document: 1, versionNumber: 1 }, { unique: true });

// Pre-save hook to ensure version numbers are sequential
versionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastVersion = await this.constructor.findOne(
      { document: this.document },
      { versionNumber: 1 },
      { sort: { versionNumber: -1 } }
    );
    
    this.versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
    
    // Update the document's current version
    await mongoose.model('Document').findByIdAndUpdate(
      this.document,
      { $set: { currentVersion: this.versionNumber } }
    );
  }
  next();
});

module.exports = mongoose.model('Version', versionSchema);
