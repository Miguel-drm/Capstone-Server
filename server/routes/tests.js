const express = require('express');
const router = express.Router();
const Test = require('../models/Test'); // Import the Test model
const verifyToken = require('../middleware/verifyToken'); // Corrected path
const mongoose = require('mongoose');

// Route to create a new test
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, testType, studentId, grade, storyId, questions } = req.body;

    // Basic validation
    if (!title || !testType || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required test details' });
    }

    // Validate questions structure and type
    for (const question of questions) {
      if (question.type !== 'short-answer' || !question.questionText) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid question format or type. Only short-answer is supported.' 
        });
      }
    }

    // Validate ObjectIds if provided
    if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid student ID format' 
      });
    }

    if (storyId && !mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid story ID format' 
      });
    }

    const newTest = new Test({
      title,
      testType,
      student: studentId || undefined,
      grade: grade || undefined,
      story: storyId || undefined,
      questions
    });

    const savedTest = await newTest.save();
    res.status(201).json({ 
      success: true, 
      message: 'Test created successfully', 
      test: savedTest 
    });

  } catch (error) {
    console.error('Error creating test:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        error: Object.values(error.errors).map(err => err.message) 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error creating test', 
      error: error.message 
    });
  }
});

// You can add other routes here later (e.g., GET all tests, GET test by ID, DELETE test)

module.exports = router; 