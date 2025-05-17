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
}, {
  timestamps: true
});

// Compound unique index on name + surname
studentSchema.index({ name: 1, surname: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student; 