const express = require('express');
const router = express.Router();
const Transcription = require('../models/Transcription');
const Story = require('../models/Story');
const verifyToken = require('../middleware/verifyToken');

// Helper function to calculate accuracy
const calculateAccuracy = (transcription, storyText) => {
  const transcriptionWords = transcription.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  const storyWords = storyText.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  
  const correctWords = transcriptionWords.filter(word => 
    storyWords.includes(word)
  );
  
  return {
    accuracy: (correctWords.length / storyWords.length) * 100,
    wordsRecognized: correctWords.length,
    totalWords: storyWords.length
  };
};

// Create a new transcription
router.post('/', verifyToken, async (req, res) => {
  try {
    const { studentId, storyId, transcription, duration } = req.body;

    // Validate required fields
    if (!studentId || !storyId || !transcription || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get the story text to calculate accuracy
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Calculate accuracy
    const { accuracy, wordsRecognized, totalWords } = calculateAccuracy(
      transcription,
      story.text
    );

    // Create new transcription
    const newTranscription = new Transcription({
      studentId,
      storyId,
      transcription,
      accuracy,
      wordsRecognized,
      totalWords,
      duration
    });

    await newTranscription.save();

    res.status(201).json({
      success: true,
      message: 'Transcription saved successfully',
      transcription: newTranscription
    });
  } catch (error) {
    console.error('Error saving transcription:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving transcription',
      error: error.message
    });
  }
});

// Get transcriptions for a specific student
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const transcriptions = await Transcription.find({ studentId })
      .sort({ createdAt: -1 })
      .populate('storyId', 'title')
      .limit(50);

    res.json({
      success: true,
      transcriptions
    });
  } catch (error) {
    console.error('Error fetching student transcriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transcriptions',
      error: error.message
    });
  }
});

// Get transcriptions for a specific story
router.get('/story/:storyId', verifyToken, async (req, res) => {
  try {
    const { storyId } = req.params;
    const transcriptions = await Transcription.find({ storyId })
      .sort({ createdAt: -1 })
      .populate('studentId', 'name surname')
      .limit(50);

    res.json({
      success: true,
      transcriptions
    });
  } catch (error) {
    console.error('Error fetching story transcriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transcriptions',
      error: error.message
    });
  }
});

// Get transcription statistics for a student
router.get('/stats/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const stats = await Transcription.aggregate([
      { $match: { studentId: mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: null,
          averageAccuracy: { $avg: '$accuracy' },
          totalReadings: { $sum: 1 },
          totalWordsRead: { $sum: '$wordsRecognized' },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        averageAccuracy: 0,
        totalReadings: 0,
        totalWordsRead: 0,
        totalDuration: 0
      }
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router; 