const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const auth = require('./auth');

// Create a new test
router.post('/', auth, async (req, res) => {
  try {
    const { title, testType, studentId, grade, storyId, questions } = req.body;

    // Validate required fields
    if (!title || !testType || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, test type, and at least one question are required'
      });
    }

    // Validate test type
    if (!['pre', 'post'].includes(testType)) {
      return res.status(400).json({
        success: false,
        message: 'Test type must be either "pre" or "post"'
      });
    }

    // Validate that either studentId or grade is provided
    if (!studentId && !grade) {
      return res.status(400).json({
        success: false,
        message: 'Either student or grade must be specified'
      });
    }

    // Validate questions
    for (const question of questions) {
      if (!question.questionText || !question.correctAnswer) {
        return res.status(400).json({
          success: false,
          message: 'Each question must have both question text and correct answer'
        });
      }
    }

    // Create new test
    const test = new Test({
      title,
      testType,
      studentId: studentId || undefined,
      grade: grade || undefined,
      storyId: storyId || undefined,
      questions
    });

    // Save test
    await test.save();

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      test
    });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating test'
    });
  }
});

// Get all tests
router.get('/', auth, async (req, res) => {
  try {
    const tests = await Test.find()
      .populate('studentId', 'name surname')
      .populate('storyId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tests'
    });
  }
});

// Get test by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('studentId', 'name surname')
      .populate('storyId', 'title');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    res.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test'
    });
  }
});

// Update test
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, testType, studentId, grade, storyId, questions } = req.body;

    // Validate required fields
    if (!title || !testType || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, test type, and at least one question are required'
      });
    }

    const test = await Test.findByIdAndUpdate(
      req.params.id,
      {
        title,
        testType,
        studentId: studentId || undefined,
        grade: grade || undefined,
        storyId: storyId || undefined,
        questions
      },
      { new: true, runValidators: true }
    );

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    res.json({
      success: true,
      message: 'Test updated successfully',
      test
    });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating test'
    });
  }
});

// Delete test
router.delete('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting test'
    });
  }
});

// Get tests by student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const tests = await Test.find({ studentId: req.params.studentId })
      .populate('storyId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('Error fetching student tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student tests'
    });
  }
});

// Get tests by grade
router.get('/grade/:grade', auth, async (req, res) => {
  try {
    const tests = await Test.find({ grade: req.params.grade })
      .populate('storyId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('Error fetching grade tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grade tests'
    });
  }
});

module.exports = router; 