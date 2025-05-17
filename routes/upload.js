const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Student = require('../models/Student');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Received file in multer:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    // Check file extension
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return cb(null, true);
    }

    // If extension check fails, check mimetype
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    console.log('File rejected:', {
      name: file.originalname,
      type: file.mimetype
    });
    
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'), false);
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next(err);
};

// Route for handling Excel file upload
router.post('/upload', upload.single('file'), handleMulterError, async (req, res) => {
  console.log('Received upload request');
  console.log('Request headers:', req.headers);
  console.log('Request file:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file');

  try {
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload an Excel file (.xlsx or .xls)' 
      });
    }

    console.log('Processing file:', req.file.originalname);

    // Read the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON without header row
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log('Total rows in Excel:', data.length);
    console.log('First row sample:', data[0]);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    // Process and validate the data
    const students = data.map((row, index) => {
      console.log(`Processing row ${index + 1}:`, row);
      
      const student = {
        name: String(row.name || row.Name || '').trim(),
        surname: String(row.surname || row.Surname || '').trim(),
        grade: String(row.grade || row.Grade || '').trim()
      };

      console.log(`Processed student ${index + 1}:`, student);
      return student;
    });

    console.log('Total processed students:', students.length);

    // Validate required fields
    const invalidStudents = students.filter(student => 
      !student.name || !student.surname || !student.grade
    );

    if (invalidStudents.length > 0) {
      console.log('Invalid students found:', invalidStudents);
      return res.status(400).json({
        success: false,
        message: 'Some records are missing required fields',
        invalidRecords: invalidStudents
      });
    }

    try {
      // Clear existing students before inserting new ones
      await Student.deleteMany({});
      console.log('Cleared existing students');

      // Insert all students at once
      console.log('Attempting to insert students:', students.length);
      const result = await Student.insertMany(students);
      console.log('Successfully inserted students:', result.length);

      // Fetch all students to verify
      const allStudents = await Student.find({});
      console.log('Verification - Total students in database:', allStudents.length);

      res.status(200).json({
        success: true,
        message: 'Students imported successfully',
        count: result.length
      });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing Excel file',
      error: error.message
    });
  }
});

// Route for getting all students
router.get('/students', async (req, res) => {
  console.log('Received request to fetch students');
  try {
    const students = await Student.find({}).sort({ name: 1, surname: 1 });
    console.log(`Found ${students.length} students in database`);
    console.log('First student sample:', students[0]);
    
    res.status(200).json({
      success: true,
      students: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students from database',
      error: error.message
    });
  }
});

module.exports = router; 