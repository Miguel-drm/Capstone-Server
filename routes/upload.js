const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Student = require('../models/Student');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file upload with better error handling
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
router.post('/upload', uploadMiddleware, async (req, res) => {
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

        // Generate a unique importBatchId for this upload
        const importBatchId = uuidv4();
        // Assign importBatchId to each student
        students.forEach(student => {
            student.importBatchId = importBatchId;
        });

        // Filter out students that already exist (by name + surname)
        const existingStudents = await Student.find({
          $or: students.map(s => ({ name: s.name, surname: s.surname }))
        }, { name: 1, surname: 1 });
        const existingSet = new Set(existingStudents.map(s => `${s.name}|${s.surname}`));
        const uniqueStudents = students.filter(s => !existingSet.has(`${s.name}|${s.surname}`));
        console.log(`Filtered out ${students.length - uniqueStudents.length} duplicate students`);

        // Get count of existing students
        const existingCount = await Student.countDocuments();
        console.log('Existing students in database:', existingCount);

        // Import to database
        const insertedStudents = await importStudentsToDatabase(uniqueStudents);
        console.log(`Successfully inserted ${insertedStudents.length} new students`);

        // Get total count after insertion
        const totalStudents = await Student.countDocuments();
        console.log('Total students in database:', totalStudents);

        res.status(200).json({
            success: true,
            message: 'Students imported successfully',
            newStudentsCount: insertedStudents.length,
            previousCount: existingCount,
            totalInDatabase: totalStudents,
            importBatchId // Optionally return the batch ID
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