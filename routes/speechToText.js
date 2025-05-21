const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Speech-to-text service is available',
    supportedLanguages: ['english', 'tagalog']
  });
});

// Speech to text endpoint
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const language = req.body.language || 'english';
    
    // For now, return a placeholder response
    // In a production environment, you would integrate with a speech-to-text service
    // such as Google Cloud Speech-to-Text, Azure Speech Services, or AWS Transcribe
    res.json({
      success: true,
      text: `[Speech-to-text placeholder for ${language}]`,
      language: language,
      fileInfo: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error('Error deleting temporary audio file:', err);
      }
    });

  } catch (error) {
    console.error('Error processing speech:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process speech'
    });
  }
});

module.exports = router; 