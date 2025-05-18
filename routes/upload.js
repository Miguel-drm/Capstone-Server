const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Student = require('../models/Student');
const Story = require('../models/Stories');
const { v4: uuidv4 } = require('uuid');

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

// Configure multer for story uploads
const storyStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine if it's a story file or image
        const isImage = file.mimetype.startsWith('image/');
        const uploadPath = isImage ? 'uploads/stories/images' : 'uploads/stories/files';
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
    }
});

const storyUpload = multer({
    storage: storyStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for stories
    },
    fileFilter: (req, file, cb) => {
        // Allow PDF, DOC, DOCX for story files
        if (file.fieldname === 'storyFile') {
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (allowedTypes.includes(file.mimetype)) {
                return cb(null, true);
            }
            return cb(new Error('Only PDF and Word documents are allowed for story files!'), false);
        }
        // Allow images for story images
        if (file.fieldname === 'storyImage') {
            if (file.mimetype.startsWith('image/')) {
                return cb(null, true);
            }
            return cb(new Error('Only image files are allowed for story images!'), false);
        }
        cb(new Error('Invalid field name'), false);
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

// Story Functions
const validateStoryData = (storyData) => {
    const errors = [];
    if (!storyData.title || typeof storyData.title !== 'string' || storyData.title.trim().length === 0) {
        errors.push('Title is required');
    }
    if (!storyData.language || !['english', 'tagalog'].includes(storyData.language)) {
        errors.push('Language must be either english or tagalog');
    }
    return errors;
};

const processStoryUpload = async (files, body) => {
    try {
        // Validate required files
        if (!files || !files.storyFile || !files.storyImage) {
            throw new Error('Both story file and image are required');
        }

        const storyFile = files.storyFile[0];
        const storyImage = files.storyImage[0];

        // Validate file types
        const allowedStoryTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!allowedStoryTypes.includes(storyFile.mimetype)) {
            throw new Error('Invalid story file type. Only PDF and Word documents are allowed.');
        }

        if (!storyImage.mimetype.startsWith('image/')) {
            throw new Error('Invalid image file type. Only images are allowed.');
        }

        // Create story data object
        const storyData = {
            title: body.title,
            language: body.language,
            storyFile: {
                fileName: storyFile.originalname,
                fileUrl: `/uploads/stories/files/${storyFile.filename}`,
                fileType: storyFile.mimetype
            },
            storyImage: {
                imageUrl: `/uploads/stories/images/${storyImage.filename}`,
                imageType: storyImage.mimetype
            }
        };

        // Validate story data
        const validationErrors = validateStoryData(storyData);
        if (validationErrors.length > 0) {
            throw new Error(validationErrors.join(', '));
        }

        // Create and save story
        const story = new Story(storyData);
        await story.save();

        return story;
    } catch (error) {
        throw new Error(`Error processing story upload: ${error.message}`);
    }
};

// Route for handling story upload
router.post('/story', storyUpload.fields([
    { name: 'storyFile', maxCount: 1 },
    { name: 'storyImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const story = await processStoryUpload(req.files, req.body);
        
        res.status(200).json({
            success: true,
            message: 'Story uploaded successfully',
            story: story.getStoryDetails()
        });
    } catch (error) {
        console.error('Error uploading story:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Route for getting all stories with pagination
router.get('/stories', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [stories, total] = await Promise.all([
            Story.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('title language storyFile storyImage createdAt'),
            Story.countDocuments({})
        ]);

        res.status(200).json({
            success: true,
            count: stories.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            stories: stories
        });
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stories'
        });
    }
});

// Route for getting stories by language with pagination
router.get('/stories/:language', async (req, res) => {
    try {
        const { language } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!['english', 'tagalog'].includes(language)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid language parameter'
            });
        }

        const [stories, total] = await Promise.all([
            Story.find({ language })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('title language storyFile storyImage createdAt'),
            Story.countDocuments({ language })
        ]);

        res.status(200).json({
            success: true,
            count: stories.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            stories: stories
        });
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stories'
        });
    }
});

// Route for deleting a story
router.delete('/stories/:id', async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'Story not found'
            });
        }

        // TODO: Delete associated files from storage
        // This would require implementing file deletion logic

        await story.remove();

        res.status(200).json({
            success: true,
            message: 'Story deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting story:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting story'
        });
    }
});

module.exports = router; 