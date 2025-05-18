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
}, {
  timestamps: true
});

// Add index for faster queries
storySchema.index({ title: 1, language: 1 });

// Add method to get story details
storySchema.methods.getStoryDetails = function() {
  return {
    id: this._id,
    title: this.title,
    language: this.language,
    storyFile: this.storyFile,
    storyImage: this.storyImage,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Story = mongoose.model('Story', storySchema);

module.exports = Story; 