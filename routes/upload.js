const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Student = require('../models/Student');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Route for handling Excel file upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload an Excel file' 
      });
    }

    // Read the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Process and validate the data
    const students = data.map(row => ({
      name: row.Name || row.name,
      surname: row.Surname || row.surname,
      email: row.Email || row.email,
      grade: row.Grade || row.grade
    }));

    // Validate required fields
    const invalidStudents = students.filter(student => 
      !student.name || !student.surname || !student.grade
    );

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some records are missing required fields',
        invalidRecords: invalidStudents
      });
    }

    // Insert students into database
    const result = await Student.insertMany(students, { ordered: false });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      message: 'Students imported successfully',
      count: result.length
    });

  } catch (error) {
    console.error('Error processing Excel file:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate email found in the Excel file'
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      message: 'Error processing Excel file',
      error: error.message
    });
  }
});

module.exports = router; 