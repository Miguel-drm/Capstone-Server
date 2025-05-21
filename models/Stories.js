const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  language: {
    type: String,
    enum: ['english', 'tagalog'],
    default: 'english'
  },
  storyFile: {
    fileName: String,
    fileType: String,
    fileSize: Number,
    gridFsId: mongoose.Schema.Types.ObjectId,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  storyImage: {
    fileName: String,
    imageUrl: String,
    imageType: String,
    imageSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
storySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add virtual for file URL
storySchema.virtual('storyFileUrl').get(function() {
  if (this.storyFile && this.storyFile.gridFsId) {
    return `/api/stories/file/${this.storyFile.gridFsId}`;
  }
  return null;
});

// Add virtual for image URL
storySchema.virtual('storyImageUrl').get(function() {
  if (this.storyImage && this.storyImage.imageUrl) {
    return `/api/uploads/${this.storyImage.imageUrl}`;
  }
  return null;
});

// Ensure virtuals are included in JSON output
storySchema.set('toJSON', { virtuals: true });
storySchema.set('toObject', { virtuals: true });

const Stories = mongoose.model('Stories', storySchema);

module.exports = Stories;