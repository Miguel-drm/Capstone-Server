const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Stories = require('../models/Stories');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload a new story
router.post('/upload', upload.fields([
  { name: 'storyFile', maxCount: 1 },
  { name: 'storyImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Received upload request:', {
      body: req.body,
      files: req.files
    });

    const { title, language } = req.body;
    const storyFile = req.files['storyFile']?.[0];
    const storyImage = req.files['storyImage']?.[0];

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const story = new Stories({
      title,
      language: language || 'english',
      storyFile: storyFile ? {
        fileName: storyFile.originalname,
        fileUrl: storyFile.path.replace(/\\/g, '/'),
        fileType: storyFile.mimetype,
        fileSize: storyFile.size
      } : null,
      storyImage: storyImage ? {
        fileName: storyImage.originalname,
        imageUrl: storyImage.path.replace(/\\/g, '/'),
        imageType: storyImage.mimetype,
        imageSize: storyImage.size
      } : null
    });

    await story.save();
    console.log('Story saved successfully:', story);
    res.status(201).json({ message: 'Story uploaded successfully', story });
  } catch (error) {
    console.error('Error uploading story:', error);
    res.status(500).json({ message: 'Error uploading story', error: error.message });
  }
});

// Get all stories
router.get('/', async (req, res) => {
  try {
    const stories = await Stories.find().sort({ createdAt: -1 });
    res.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: 'Error fetching stories', error: error.message });
  }
});

// Get a single story
router.get('/:id', async (req, res) => {
  try {
    const story = await Stories.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    res.json({ story });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ message: 'Error fetching story', error: error.message });
  }
});

// Delete a story
router.delete('/:id', async (req, res) => {
  try {
    const story = await Stories.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Delete associated files
    if (story.storyFile?.fileUrl) {
      try {
        fs.unlinkSync(story.storyFile.fileUrl);
      } catch (err) {
        console.error('Error deleting story file:', err);
      }
    }
    if (story.storyImage?.imageUrl) {
      try {
        fs.unlinkSync(story.storyImage.imageUrl);
      } catch (err) {
        console.error('Error deleting story image:', err);
      }
    }

    await story.deleteOne();
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ message: 'Error deleting story', error: error.message });
  }
});

module.exports = router; 