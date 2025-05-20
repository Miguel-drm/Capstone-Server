const mongoose = require('mongoose');

const transcriptionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  transcription: {
    type: String,
    required: true
  },
  accuracy: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  wordsRecognized: {
    type: Number,
    required: true,
    default: 0
  },
  totalWords: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
transcriptionSchema.index({ studentId: 1, createdAt: -1 });
transcriptionSchema.index({ storyId: 1, createdAt: -1 });

module.exports = mongoose.model('Transcription', transcriptionSchema); 