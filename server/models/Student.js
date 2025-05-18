const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  surname: {
    type: String,
    required: [true, 'Surname is required'],
    trim: true
  },
  grade: {
    type: String,
    required: [true, 'Education Level is required'],
    trim: true
  },
  importBatchId: {
    type: String,
    required: true
  },
  // Add story-related fields
  readingProgress: {
    completedStories: [{
      storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story'
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      }
    }],
    currentStory: {
      storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story'
      },
      startedAt: {
        type: Date,
        default: Date.now
      },
      lastReadPage: {
        type: Number,
        default: 1
      }
    }
  },
  preferences: {
    preferredLanguage: {
      type: String,
      enum: ['english', 'tagalog'],
      default: 'english'
    },
    readingLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  },
  statistics: {
    totalStoriesRead: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    totalReadingTime: {
      type: Number, // in minutes
      default: 0
    }
  }
}, {
  timestamps: true
});

// Compound unique index on name + surname
studentSchema.index({ name: 1, surname: 1 }, { unique: true });

// Add index for faster queries
studentSchema.index({ 'readingProgress.completedStories.storyId': 1 });
studentSchema.index({ 'preferences.preferredLanguage': 1 });
studentSchema.index({ 'preferences.readingLevel': 1 });

// Method to add a completed story
studentSchema.methods.addCompletedStory = async function(storyId, score) {
  this.readingProgress.completedStories.push({
    storyId,
    completedAt: new Date(),
    score
  });
  
  // Update statistics
  this.statistics.totalStoriesRead += 1;
  const totalScore = this.readingProgress.completedStories.reduce((sum, story) => sum + story.score, 0);
  this.statistics.averageScore = totalScore / this.statistics.totalStoriesRead;
  
  // Clear current story if it matches the completed one
  if (this.readingProgress.currentStory && 
      this.readingProgress.currentStory.storyId.toString() === storyId.toString()) {
    this.readingProgress.currentStory = null;
  }
  
  await this.save();
  return this;
};

// Method to start reading a story
studentSchema.methods.startReadingStory = async function(storyId) {
  this.readingProgress.currentStory = {
    storyId,
    startedAt: new Date(),
    lastReadPage: 1
  };
  await this.save();
  return this;
};

// Method to update reading progress
studentSchema.methods.updateReadingProgress = async function(pageNumber) {
  if (this.readingProgress.currentStory) {
    this.readingProgress.currentStory.lastReadPage = pageNumber;
    await this.save();
  }
  return this;
};

// Method to update preferences
studentSchema.methods.updatePreferences = async function(preferences) {
  if (preferences.preferredLanguage) {
    this.preferences.preferredLanguage = preferences.preferredLanguage;
  }
  if (preferences.readingLevel) {
    this.preferences.readingLevel = preferences.readingLevel;
  }
  await this.save();
  return this;
};

// Static method to find students by grade
studentSchema.statics.findByGrade = function(grade) {
  return this.find({ grade });
};

// Static method to find students by reading level
studentSchema.statics.findByReadingLevel = function(level) {
  return this.find({ 'preferences.readingLevel': level });
};

// Static method to get reading statistics
studentSchema.statics.getReadingStatistics = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$grade',
        totalStudents: { $sum: 1 },
        totalStoriesRead: { $sum: '$statistics.totalStoriesRead' },
        averageScore: { $avg: '$statistics.averageScore' },
        totalReadingTime: { $sum: '$statistics.totalReadingTime' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student; 