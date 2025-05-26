const mongoose = require('mongoose');

const testQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['short-answer'],
    required: true
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  correctAnswer: {
    type: String,
    required: [true, 'Correct answer is required'],
    trim: true
  }
});

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true
  },
  testType: {
    type: String,
    enum: ['pre', 'post'],
    required: [true, 'Test type is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false
  },
  grade: {
    type: String,
    required: false
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: false
  },
  questions: [testQuestionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'tests'
});

// Add validation to ensure at least one question exists
testSchema.pre('save', function(next) {
  if (this.questions.length === 0) {
    next(new Error('Test must have at least one question'));
  }
  next();
});

// Add validation to ensure either studentId or grade is provided
testSchema.pre('save', function(next) {
  if (!this.studentId && !this.grade) {
    next(new Error('Either student or grade must be specified'));
  }
  next();
});

const Test = mongoose.model('Test', testSchema);

module.exports = Test; 