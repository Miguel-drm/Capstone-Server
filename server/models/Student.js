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
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    default: null
  },
  grade: {
    type: String,
    required: [true, 'Grade is required'],
    trim: true
  },
}, {
  timestamps: true
});

// Drop existing indexes
studentSchema.indexes().forEach(index => {
  studentSchema.index(index[0], { ...index[1], unique: false });
});

// Create new index for email that allows null values
studentSchema.index({ email: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { email: { $type: "string" } }
});

const Student = mongoose.model('Student', studentSchema);

// Drop existing indexes from the collection
Student.collection.dropIndexes().catch(err => {
  console.log('No indexes to drop or error dropping indexes:', err);
});

module.exports = Student; 