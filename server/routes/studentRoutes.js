const express = require('express');
const router = express.Router();
const Student = require('../models/Student'); // Assuming you have a Student model

// Get all students with optional grade filter
router.get('/students', async (req, res) => {
  try {
    const { grade } = req.query;
    const query = grade ? { grade } : {};
    const students = await Student.find(query, 'id name surname grade');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

// Export data endpoint
router.post('/export', async (req, res) => {
  try {
    const { dataType, selectedStudent, selectedGrade, exportType } = req.body;
    
    let query = {};
    if (exportType === 'individual' && selectedStudent) {
      query._id = selectedStudent;
    } else if (exportType === 'class' && selectedGrade) {
      query.grade = selectedGrade;
    }

    const students = await Student.find(query);
    
    // TODO: Implement the actual data export logic based on dataType
    // This could involve fetching test results or reading progress
    // and formatting them for export

    res.json({
      message: 'Export successful',
      data: {
        students,
        dataType,
        exportType
      }
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Error exporting data', error: error.message });
  }
});

module.exports = router; 