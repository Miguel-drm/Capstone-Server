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
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    gridFsId: mongoose.Schema.Types.ObjectId // Add GridFS file id
  },
  storyImage: {
    fileName: String,
    imageUrl: String,
    imageType: String,
    imageSize: Number
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

const Stories = mongoose.model('Stories', storySchema);

module.exports = Stories;