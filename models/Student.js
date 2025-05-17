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
    sparse: true
  },
  grade: {
    type: String,
    required: [true, 'Grade is required'],
    trim: true
  },
}, {
  timestamps: true
});

studentSchema.index({ email: 1 }, { unique: false });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student; 