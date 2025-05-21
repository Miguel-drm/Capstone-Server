const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoClient, GridFSBucket } = require('mongodb');
const gridfsStream = require('gridfs-stream');
const Stories = require('../models/Stories');

// Serve static files from the uploads directory
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  console.log('Processing file:', {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    originalname: file.originalname
  });

  // Accept images and documents
  if (file.fieldname === 'storyImage') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for story images'), false);
    }
  } else if (file.fieldname === 'storyFile') {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/msword' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed for story files'), false);
    }
  } else {
    cb(new Error('Invalid field name'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 2 // Maximum 2 files (1 story file + 1 image)
  },
  fileFilter: fileFilter
});

// GridFS setup
let gfs, gridfsBucket;
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capstone';
mongoose.connection.on('connected', () => {
  gridfsBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'storyFiles' });
  gfs = gridfsStream(mongoose.connection.db, mongoose.mongo);
  gfs.collection('storyFiles');
});

// Helper function to save base64 file
const saveBase64File = async (base64Data, filename, mimetype) => {
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(filename);
  const filePath = path.join(uploadDir, `${filename}-${uniqueSuffix}${ext}`);

  // Remove data URL prefix if present
  const base64Content = base64Data.replace(/^data:.*?;base64,/, '');
  await fs.promises.writeFile(filePath, base64Content, 'base64');

  return {
    path: filePath,
    filename: `${filename}-${uniqueSuffix}${ext}`,
    mimetype
  };
};

// Upload a new story
router.post('/upload', async (req, res) => {
  try {
    console.log('Received upload request:', {
      body: req.body,
      files: req.files,
      headers: req.headers
    });

    const { title, language, storyFile, storyImage } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!storyFile) {
      return res.status(400).json({ message: 'Story file is required' });
    }

    // Save story file
    const savedStoryFile = await saveBase64File(
      storyFile.data,
      storyFile.name,
      storyFile.type
    );

    // Save story image if provided
    let savedStoryImage = null;
    if (storyImage) {
      savedStoryImage = await saveBase64File(
        storyImage.data,
        storyImage.name,
        storyImage.type
      );
    }

    // Create relative paths for storage in database
    const getRelativePath = (filePath) => {
      try {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('uploads/');
        if (parts.length !== 2) {
          throw new Error('Invalid file path structure');
        }
        return parts[1];
      } catch (error) {
        console.error('Error processing file path:', error);
        throw error;
      }
    };

    // Check if GridFS is initialized
    if (!gridfsBucket) {
      console.error('GridFSBucket is not initialized');
      return res.status(500).json({ message: 'GridFS is not ready. Please try again later.' });
    }

    // Save PDF to GridFS
    const fileStream = fs.createReadStream(savedStoryFile.path);
    const uploadStream = gridfsBucket.openUploadStream(savedStoryFile.filename, {
      contentType: savedStoryFile.mimetype,
      metadata: { title, language }
    });

    fileStream.pipe(uploadStream)
      .on('error', (err) => {
        console.error('GridFS upload error:', err);
        return res.status(500).json({ message: 'Failed to upload PDF to GridFS', error: err.message });
      })
      .on('finish', async (file) => {
        try {
          // Create story document with GridFS file id
          const story = new Stories({
            title,
            language: language || 'english',
            storyFile: {
              fileName: savedStoryFile.filename,
              fileType: savedStoryFile.mimetype,
              fileSize: fs.statSync(savedStoryFile.path).size,
              gridFsId: file._id
            },
            storyImage: savedStoryImage ? {
              fileName: savedStoryImage.filename,
              imageUrl: getRelativePath(savedStoryImage.path),
              imageType: savedStoryImage.mimetype,
              imageSize: fs.statSync(savedStoryImage.path).size
            } : null
          });

          // Save to database
          await story.save();
          console.log('Story saved successfully:', story);

          // Clean up the temporary files
          fs.unlinkSync(savedStoryFile.path);
          if (savedStoryImage) {
            fs.unlinkSync(savedStoryImage.path);
          }

          res.status(201).json({ 
            message: 'Story uploaded successfully', 
            story 
          });
        } catch (error) {
          console.error('Error saving story:', error);
          res.status(500).json({ 
            message: 'Error saving story', 
            error: error.message 
          });
        }
      });
  } catch (error) {
    console.error('Error uploading story:', error);
    res.status(500).json({ 
      message: 'Error uploading story', 
      error: error.message 
    });
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  console.error('Multer error:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 10MB' });
    }
    return res.status(400).json({ message: error.message });
  }
  next(error);
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
        const uploadsDir = path.join(__dirname, '../uploads');
        const filePath = path.join(uploadsDir, story.storyFile.fileUrl.replace(/^\/+/g, ''));
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting story file:', err);
      }
    }
    if (story.storyImage?.imageUrl) {
      try {
        const uploadsDir = path.join(__dirname, '../uploads');
        const filePath = path.join(uploadsDir, story.storyImage.imageUrl.replace(/^\/+/g, ''));
        fs.unlinkSync(filePath);
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