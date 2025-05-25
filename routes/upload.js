const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Student = require('../models/Student');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'excel-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        fieldSize: 5 * 1024 * 1024 // 5MB limit for field size
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            return cb(null, true);
        }
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'), false);
    }
}).single('file');

// Wrapper for multer to handle errors
const uploadMiddleware = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size must be less than 5MB'
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Validate file type
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== '.xlsx' && ext !== '.xls') {
            // Clean up the uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Only Excel files (.xlsx, .xls) are allowed!'
            });
        }

        next();
    });
};

// Function to validate student data
function validateStudent(student) {
    const errors = [];
    if (!student.name || typeof student.name !== 'string' || student.name.trim().length === 0) {
        errors.push('Name is required');
    }
    if (!student.surname || typeof student.surname !== 'string' || student.surname.trim().length === 0) {
        errors.push('Surname is required');
    }
    if (!student.grade || typeof student.grade !== 'string' || student.grade.trim().length === 0) {
        errors.push('Education Level is required');
    } else {
        // Normalize the grade format
        const normalizedGrade = student.grade.trim()
            .replace(/^grade\s*/i, '') // Remove "grade" prefix if present
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
        
        // Convert to the required format
        const validGrades = ['1', '2', '3', '4'];
        if (validGrades.includes(normalizedGrade)) {
            student.grade = `Grade ${normalizedGrade}`;
        } else {
            errors.push('Education Level must be Grade 1, Grade 2, Grade 3, or Grade 4');
        }
    }
    return errors;
}

// Function to process Excel data
async function processExcelData(filePath) {
    try {
        // Read the Excel file
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (data.length <= 1) {
            throw new Error('Excel file is empty or contains only headers');
        }

        // Get headers and validate
        const headers = data[0].map(h => h.toLowerCase());
        const requiredHeaders = ['name', 'surname', 'grade'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
        }

        // Process rows
        const students = [];
        const errors = [];
        
        data.slice(1).forEach((row, index) => {
            try {
                const student = {
                    name: String(row[headers.indexOf('name')] || '').trim(),
                    surname: String(row[headers.indexOf('surname')] || '').trim(),
                    grade: String(row[headers.indexOf('grade')] || '').trim()
                };

                const validationErrors = validateStudent(student);
                if (validationErrors.length > 0) {
                    errors.push(`Row ${index + 2}: ${validationErrors.join(', ')}`);
                } else {
                    students.push(student);
                }
            } catch (err) {
                errors.push(`Row ${index + 2}: Invalid data format`);
            }
        });

        if (errors.length > 0) {
            throw new Error(`Validation errors found:\n${errors.join('\n')}`);
        }

        return students;
    } catch (error) {
        throw new Error(`Error processing Excel file: ${error.message}`);
    }
}

// Route for handling Excel file upload
router.post('/upload', uploadMiddleware, async (req, res) => {
    try {
        // Process Excel data
        const students = await processExcelData(req.file.path);
        
        // Generate a unique importBatchId for this upload
        const importBatchId = uuidv4();
        
        // Assign importBatchId to each student
        students.forEach(student => {
            student.importBatchId = importBatchId;
        });

        // Get count of existing students
        const existingCount = await Student.countDocuments();

        // Import to database with error handling
        let insertedStudents;
        try {
            insertedStudents = await Student.insertMany(students, { 
                ordered: false // Continue processing even if some documents fail
            });
        } catch (insertError) {
            // If there are duplicate key errors, handle them gracefully
            if (insertError.code === 11000) {
                // Get the successfully inserted students
                insertedStudents = insertError.result.result.insertedIds;
            } else {
                throw insertError;
            }
        }

        // Get total count after insertion
        const totalStudents = await Student.countDocuments();

        // Clean up: Delete the uploaded file
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            success: true,
            message: 'Students imported successfully',
            newStudentsCount: insertedStudents.length,
            previousCount: existingCount,
            totalInDatabase: totalStudents,
            importBatchId
        });

    } catch (error) {
        // Clean up: Delete the uploaded file if it exists
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }

        console.error('Error processing upload:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Route for getting all students
router.get('/students', async (req, res) => {
    try {
        const students = await Student.find({})
            .sort({ name: 1, surname: 1 })
            .select('name surname grade');
            
        res.status(200).json({
            success: true,
            count: students.length,
            students: students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching students'
        });
    }
});

// Route for getting students grouped by importBatchId
router.get('/grouped', async (req, res) => {
    try {
        const grouped = await Student.aggregate([
            {
                $group: {
                    _id: '$importBatchId',
                    students: { $push: {
                        _id: '$_id',
                        name: '$name',
                        surname: '$surname',
                        email: '$email',
                        grade: '$grade',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt'
                    } }
                }
            },
            { $sort: { '_id': -1 } }
        ]);
        res.status(200).json({
            success: true,
            groups: grouped.map(g => ({
                importBatchId: g._id,
                students: g.students
            }))
        });
    } catch (error) {
        console.error('Error fetching grouped students:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching grouped students'
        });
    }
});

module.exports = router; 