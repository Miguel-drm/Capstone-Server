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

// Configure multer for file upload with disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer with better error handling
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        fieldSize: 5 * 1024 * 1024 // 5MB limit for fields
    },
    fileFilter: (req, file, cb) => {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            return cb(null, true);
        }
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'), false);
    }
});

// Create a middleware function to handle multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
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
        const headers = data[0].map(h => String(h).toLowerCase().trim());
        const requiredHeaders = ['name', 'surname', 'grade'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Please ensure your Excel file has the following columns: Name, Surname, Grade`);
        }

        // Process rows
        const students = [];
        const errors = [];
        
        data.slice(1).forEach((row, index) => {
            try {
                if (!row || row.length === 0) {
                    errors.push(`Row ${index + 2}: Empty row`);
                    return;
                }

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

        if (students.length === 0) {
            throw new Error('No valid students found in the Excel file. Please check the data format.');
        }

        if (errors.length > 0) {
            console.warn('Validation errors found:', errors);
        }

        return students;
    } catch (error) {
        throw new Error(`Error processing Excel file: ${error.message}`);
    }
}

// Function to import students to database
async function importStudentsToDatabase(students) {
    try {
        console.log('Starting to import new students...');

        // Insert new students in batches
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < students.length; i += batchSize) {
            batches.push(students.slice(i, i + batchSize));
        }

        const results = [];
        const errors = [];

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            try {
                // Try to insert the batch
                const batchResult = await Student.insertMany(batch, { 
                    ordered: false, // Continue processing even if some documents fail
                    rawResult: true // Get detailed result information
                });
                
                if (batchResult.insertedCount > 0) {
                    results.push(...batchResult.insertedIds);
                    console.log(`Successfully inserted batch ${batchIndex + 1} with ${batchResult.insertedCount} students`);
                }

                // Check for write errors
                if (batchResult.writeErrors && batchResult.writeErrors.length > 0) {
                    batchResult.writeErrors.forEach(err => {
                        const student = batch[err.index];
                        errors.push({
                            row: batchIndex * batchSize + err.index + 1,
                            student: `${student.name} ${student.surname}`,
                            error: err.errmsg
                        });
                    });
                }
            } catch (batchError) {
                console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
                // Try inserting one by one if batch insert fails
                for (let i = 0; i < batch.length; i++) {
                    try {
                        const student = batch[i];
                        // Check if student with same name and surname already exists
                        const existingStudent = await Student.findOne({
                            name: student.name,
                            surname: student.surname
                        });

                        if (existingStudent) {
                            // Update existing student
                            const updatedStudent = await Student.findByIdAndUpdate(
                                existingStudent._id,
                                { $set: student },
                                { new: true }
                            );
                            results.push(updatedStudent._id);
                            console.log(`Updated existing student: ${student.name} ${student.surname}`);
                        } else {
                            // Insert new student
                            const newStudent = await Student.create(student);
                            results.push(newStudent._id);
                            console.log(`Successfully inserted student: ${student.name} ${student.surname}`);
                        }
                    } catch (singleError) {
                        errors.push({
                            row: batchIndex * batchSize + i + 1,
                            student: `${batch[i].name} ${batch[i].surname}`,
                            error: singleError.message
                        });
                    }
                }
            }
        }

        // If we have any errors, throw them with details
        if (errors.length > 0) {
            const errorMessage = errors.map(err => 
                `Row ${err.row} (${err.student}): ${err.error}`
            ).join('\n');
            throw new Error(`Some students could not be inserted:\n${errorMessage}`);
        }

        return results;
    } catch (error) {
        console.error('Database insertion error:', error);
        throw error;
    }
}

// Route for handling Excel file upload
router.post('/upload', upload.single('file'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an Excel file'
            });
        }

        console.log('Processing file:', req.file.originalname);
        
        // Process Excel data
        const students = await processExcelData(req.file.path);
        console.log(`Processed ${students.length} valid students`);

        if (students.length === 0) {
            // Clean up: Delete the uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'No valid students found in the Excel file. Please check the file format.'
            });
        }

        // Generate a unique importBatchId for this upload
        const importBatchId = uuidv4();
        // Assign importBatchId to each student
        students.forEach(student => {
            student.importBatchId = importBatchId;
        });

        // Get count of existing students
        const existingCount = await Student.countDocuments();
        console.log('Existing students in database:', existingCount);

        // Import to database
        const insertedStudents = await importStudentsToDatabase(students);
        console.log(`Successfully inserted ${insertedStudents.length} new students`);

        // Clean up: Delete the uploaded file
        fs.unlinkSync(req.file.path);

        // Get total count after insertion
        const totalStudents = await Student.countDocuments();
        console.log('Total students in database:', totalStudents);

        return res.status(200).json({
            success: true,
            message: 'Students imported successfully',
            newStudentsCount: insertedStudents.length,
            previousCount: existingCount,
            totalInDatabase: totalStudents
        });

    } catch (error) {
        // Clean up: Delete the uploaded file if it exists
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }

        console.error('Error processing upload:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error processing Excel file'
        });
    }
});

// Route for getting all students
router.get('/students', async (req, res) => {
    try {
        console.log('Received request for students');
        console.log('Auth header:', req.headers.authorization);

        // Check if user is authenticated
        if (!req.headers.authorization) {
            console.log('No authorization header found');
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const students = await Student.find({})
            .sort({ name: 1, surname: 1 })
            .select('name surname grade');
            
        console.log(`Found ${students.length} students`);
        
        // Ensure we're sending a consistent response format
        return res.status(200).json({
            success: true,
            count: students.length,
            students: students || [] // Ensure students is always an array
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching students',
            error: error.message
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