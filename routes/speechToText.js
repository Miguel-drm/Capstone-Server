const express = require('express');
const router = express.Router();
const vosk = require('vosk');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Initialize Vosk models
const models = {
  en: null,
  tl: null
};

// Model paths
const MODEL_PATHS = {
  en: path.join(__dirname, '../models/vosk-model-small-en-us'),
  tl: path.join(__dirname, '../models/vosk-model-small-tl')
};

// Initialize models
try {
  if (fs.existsSync(MODEL_PATHS.en)) {
    models.en = new vosk.Model(MODEL_PATHS.en);
    console.log('English model loaded successfully');
  } else {
    console.error('English model not found at:', MODEL_PATHS.en);
  }

  if (fs.existsSync(MODEL_PATHS.tl)) {
    models.tl = new vosk.Model(MODEL_PATHS.tl);
    console.log('Tagalog model loaded successfully');
  } else {
    console.error('Tagalog model not found at:', MODEL_PATHS.tl);
  }
} catch (error) {
  console.error('Error initializing Vosk models:', error);
}

// Test endpoint
router.get('/test', (req, res) => {
  const availableModels = Object.entries(models)
    .filter(([_, model]) => model !== null)
    .map(([lang]) => lang);
  
  res.json({
    success: true,
    message: 'Vosk is available',
    availableModels
  });
});

// Speech to text endpoint
router.post('/', async (req, res) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const language = req.body.language || 'en';
    const model = models[language];

    if (!model) {
      return res.status(400).json({
        success: false,
        error: `Language model not available for: ${language}`
      });
    }

    const audioFile = req.files.audio;
    const audioData = await fs.promises.readFile(audioFile.tempFilePath);
    
    // Create a readable stream from the audio data
    const audioStream = new Readable();
    audioStream.push(audioData);
    audioStream.push(null);

    // Create a recognizer
    const recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 });
    
    // Process the audio stream
    let text = '';
    for await (const chunk of audioStream) {
      if (recognizer.AcceptWaveform(chunk)) {
        const result = JSON.parse(recognizer.Result());
        text += result.text + ' ';
      }
    }

    // Get final result
    const finalResult = JSON.parse(recognizer.FinalResult());
    text += finalResult.text;

    // Clean up
    recognizer.Free();
    await fs.promises.unlink(audioFile.tempFilePath);

    res.json({
      success: true,
      text: text.trim()
    });

  } catch (error) {
    console.error('Error processing speech:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process speech'
    });
  }
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  Object.values(models).forEach(model => {
    if (model) {
      model.Free();
    }
  });
  process.exit();
});

module.exports = router; 

module.exports = router; 