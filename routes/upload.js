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
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];

    if ((ext === 'xlsx' || ext === 'xls') || allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'), false);
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

// Upload route
router.post('/upload', upload.single('file'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload an Excel file (.xlsx or .xls)' 
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Excel file has no data rows'
      });
    }

    const students = data.slice(1).map(row => ({
      name: String(row[0] || '').trim(),
      surname: String(row[1] || '').trim(),
      grade: String(row[2] || '').trim()
    }));

    const invalidStudents = students.filter(s => !s.name || !s.surname || !s.grade);
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some records are missing required fields',
        invalidRecords: invalidStudents
      });
    }

    // Clear existing students (optional)
    await Student.deleteMany({});

    // Insert all students in bulk
    const insertedStudents = await Student.insertMany(students);

    res.status(200).json({
      success: true,
      message: 'Students imported successfully',
      count: insertedStudents.length
    });

  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing Excel file',
      error: error.message
    });
  }
});

// Get all students
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find({}).sort({ name: 1, surname: 1 });
    res.status(200).json({
      success: true,
      students: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching students from database',
      error: error.message
    });
  }
});

module.exports = router;
