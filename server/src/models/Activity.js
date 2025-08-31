import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: false
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'view', 'share', 'login', 'logout', 'search']
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ document: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });

// Virtual for user details
activitySchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  select: 'username email'
});

// Virtual for document details
activitySchema.virtual('documentDetails', {
  ref: 'Document',
  localField: 'document',
  foreignField: '_id',
  justOne: true,
  select: 'title isPublic'
});

// Pre-save hook to clean up details field
activitySchema.pre('save', function(next) {
  // Remove undefined or null values from details
  if (this.details && typeof this.details === 'object') {
    Object.keys(this.details).forEach(key => {
      if (this.details[key] === undefined || this.details[key] === null) {
        delete this.details[key];
      }
    });
  }
  next();
});

// Static method to log an activity
activitySchema.statics.log = async function(activityData) {
  try {
    const activity = new this(activityData);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
