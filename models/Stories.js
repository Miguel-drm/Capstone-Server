const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Story title is required'],
    trim: true
  },
  language: {
    type: String,
    required: [true, 'Language is required'],
    enum: ['english', 'tagalog'],
    default: 'english'
  },
  storyFile: {
    fileName: {
      type: String,
      required: [true, 'Story file name is required']
    },
    fileUrl: {
      type: String,
      required: [true, 'Story file URL is required']
    },
    fileType: {
      type: String,
      required: [true, 'File type is required']
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required']
    }
  },
  storyImage: {
    imageUrl: {
      type: String,
      required: [true, 'Story image URL is required']
    },
    imageType: {
      type: String,
      required: [true, 'Image type is required']
    },
    imageSize: {
      type: Number,
      required: [true, 'Image size is required']
    }
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader information is required']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
storySchema.index({ title: 1, language: 1 });
storySchema.index({ uploadedBy: 1 });
storySchema.index({ status: 1 });

// Add method to get story details
storySchema.methods.getStoryDetails = function() {
  return {
    id: this._id,
    title: this.title,
    language: this.language,
    storyFile: this.storyFile,
    storyImage: this.storyImage,
    uploadedBy: this.uploadedBy,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Add static method to find stories by language
storySchema.statics.findByLanguage = function(language) {
  return this.find({ language, status: 'approved' });
};

// Add static method to find stories by uploader
storySchema.statics.findByUploader = function(uploaderId) {
  return this.find({ uploadedBy: uploaderId });
};

const Story = mongoose.model('Story', storySchema);

module.exports = Story; 