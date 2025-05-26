const express = require('express');
const router = express.Router();
const Test = require('../models/Test'); // Import the Test model
const verifyToken = require('../middleware/verifyToken'); // Corrected path

// Route to create a new test
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, testType, studentId, grade, storyId, questions } = req.body;

    // Basic validation
    if (!title || !testType || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required test details' });
    }

    // Validate questions structure and type (ensure they are short-answer for now)
    for (const question of questions) {
        if (question.type !== 'short-answer' || !question.questionText) {
             return res.status(400).json({ success: false, message: 'Invalid question format or type. Only short-answer is supported.' });
        }
        // Optional: Add validation for correctAnswer if needed for scoring later
    }

    const newTest = new Test({
      title,
      testType,
      student: studentId || undefined, // Use studentId if provided
      grade: grade || undefined, // Use grade if provided
      story: storyId || undefined, // Use storyId if provided
      questions
    });

    const savedTest = await newTest.save();

    res.status(201).json({ success: true, message: 'Test created successfully', test: savedTest });

  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ success: false, message: 'Error creating test', error: error.message });
  }
});

// You can add other routes here later (e.g., GET all tests, GET test by ID, DELETE test)

module.exports = router; 