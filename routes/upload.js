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
        // Check file extension
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            return cb(null, true);
        }
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'), false);
    }
});

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
        errors.push('Grade is required');
    }
    return errors;
}

// Function to process Excel data
async function processExcelData(fileBuffer) {
    try {
        // Read the Excel file
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
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

// Function to import students to database
async function importStudentsToDatabase(students) {
    try {
        // Clear existing students
        await Student.deleteMany({});
        console.log('Cleared existing students');

        // Insert new students in batches
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < students.length; i += batchSize) {
            batches.push(students.slice(i, i + batchSize));
        }

        const results = [];
        for (const batch of batches) {
            const batchResult = await Student.insertMany(batch, { ordered: false });
            results.push(...batchResult);
            console.log(`Inserted batch of ${batch.length} students`);
        }

        return results;
    } catch (error) {
        if (error.writeErrors) {
            const errors = error.writeErrors.map(err => ({
                row: err.index,
                error: err.errmsg
            }));
            throw new Error(`Database insertion errors: ${JSON.stringify(errors)}`);
        }
        throw new Error(`Database error: ${error.message}`);
    }
}

// Route for handling Excel file upload
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an Excel file'
            });
        }

        console.log('Processing file:', req.file.originalname);
        
        // Process Excel data
        const students = await processExcelData(req.file.buffer);
        console.log(`Processed ${students.length} valid students`);

        // Import to database
        const insertedStudents = await importStudentsToDatabase(students);
        console.log(`Successfully inserted ${insertedStudents.length} students`);

        // Verify the insertion
        const totalStudents = await Student.countDocuments();
        console.log('Total students in database:', totalStudents);

        res.status(200).json({
            success: true,
            message: 'Students imported successfully',
            count: insertedStudents.length,
            totalInDatabase: totalStudents
        });

    } catch (error) {
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

module.exports = router; 