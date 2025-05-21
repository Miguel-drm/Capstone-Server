const express = require('express');
const router = express.Router();
const { Cheetah } = require('@picovoice/cheetah-node');
const fs = require('fs');
const path = require('path');

// Initialize Cheetah
let cheetah = null;
let isInitialized = false;

async function initializeCheetah() {
  if (isInitialized) return;

  try {
    const accessKey = process.env.PICOVOICE_ACCESS_KEY;
    if (!accessKey) {
      throw new Error('PICOVOICE_ACCESS_KEY environment variable is not set');
    }

    cheetah = new Cheetah(accessKey, {
      modelPath: path.join(__dirname, '../models/cheetah_model.pv'),
      libraryPath: path.join(__dirname, '../lib/cheetah_node.dll'),
    });

    isInitialized = true;
    console.log('Cheetah initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Cheetah:', error);
    throw error;
  }
}

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeCheetah();
    }
    res.json({
      success: true,
      message: 'Cheetah is available'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to initialize Cheetah: ${error.message}`
    });
  }
});

// Convert speech to text
router.post('/', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeCheetah();
    }

    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const audioFile = req.files.audio;
    const audioData = fs.readFileSync(audioFile.path);
    
    // Process audio with Cheetah
    const transcript = await cheetah.process(audioData);
    
    // Clean up temporary file
    fs.unlinkSync(audioFile.path);

    res.json({
      success: true,
      text: transcript,
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error processing audio: ${error.message}`
    });
  }
});

// Stream audio and convert to text
router.post('/stream', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeCheetah();
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    
    req.on('end', async () => {
      try {
        const audioData = Buffer.concat(chunks);
        const transcript = await cheetah.process(audioData);
        
        res.json({
          success: true,
          text: transcript,
          error: null
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: `Error processing audio stream: ${error.message}`
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error handling audio stream: ${error.message}`
    });
  }
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  if (cheetah) {
    cheetah.release();
  }
  process.exit();
});

module.exports = router; 