const express = require('express');
const router = express.Router();
const Transcription = require('../models/Transcription');
const Stories = require('../models/Stories');
const verifyToken = require('../middleware/verifyToken');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

// Vosk model paths
const VOSK_MODELS = {
  english: path.join(__dirname, '../models/vosk-model-small-en-us'),
  tagalog: path.join(__dirname, '../models/vosk-model-small-tl')
};

// Helper function to run Vosk recognition
async function recognizeSpeech(audioBuffer, language) {
  try {
    // Load the appropriate Vosk model
    const modelPath = VOSK_MODELS[language];
    if (!modelPath || !fs.existsSync(modelPath)) {
      throw new Error(`Vosk model for ${language} not found`);
    }

    // Create a temporary WAV file
    const tempFile = path.join(__dirname, '../temp', `${Date.now()}.wav`);
    fs.writeFileSync(tempFile, audioBuffer);

    // Use the Web Speech API for recognition
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'english' ? 'en-US' : 'tl-PH';

    return new Promise((resolve, reject) => {
      let result = '';
      let duration = 0;
      const startTime = Date.now();

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        result = transcript;
      };

      recognition.onerror = (event) => {
        reject(new Error(`Recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        duration = (Date.now() - startTime) / 1000; // Convert to seconds
        resolve({
          text: result,
          duration
        });
      };

      // Start recognition
      recognition.start();
    });
  } catch (error) {
    throw new Error(`Speech recognition failed: ${error.message}`);
  }
}

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
    const { studentId, storyId, transcription, language = 'english' } = req.body;

    // Validate required fields
    if (!studentId || !storyId || !transcription) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate language
    if (!['english', 'tagalog'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Must be either english or tagalog'
      });
    }

    // Get the story
    const story = await Stories.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Calculate accuracy
    const { accuracy, wordsRecognized, totalWords } = calculateAccuracy(
      transcription,
      story.text || ''
    );

    // Create new transcription
    const newTranscription = new Transcription({
      studentId,
      storyId,
      transcription,
      accuracy,
      wordsRecognized,
      totalWords,
      language
    });

    await newTranscription.save();

    res.status(201).json({
      success: true,
      message: 'Transcription saved successfully',
      transcription: newTranscription
    });
  } catch (error) {
    console.error('Error processing transcription:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing transcription',
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