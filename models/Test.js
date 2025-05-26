const mongoose = require('mongoose');

// Define the schema for individual test questions
const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['short-answer'] // Only short-answer supported for now
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  correctAnswer: {
    type: String,
    // Making this optional at the schema level for flexibility, 
    // but validation should ensure it's present for scorable questions.
    trim: true
  }
});

// Define the main schema for a Test
const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true
  },
  testType: {
    type: String,
    required: [true, 'Test type is required'],
    enum: ['pre', 'post']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false // Optional assignment
  },
  grade: {
    type: String,
    required: false // Optional assignment
  },
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stories',
    required: false // Optional assignment
  },
  questions: [
    questionSchema // Array of question subdocuments
  ]
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Create the Test model
const Test = mongoose.model('Test', testSchema);

module.exports = Test; 