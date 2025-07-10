const Department = require('../models/departmentSchema'); // Import the Department model

// Fetch all departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}); // Fetch all departments, you can add filters if needed
    
    if (!departments || departments.length === 0) {
      return res.status(404).json({ message: 'No departments found' });
    }

    res.status(200).json({
        message: 'Departments fetched successfully',
        data: departments
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error });
  }
};
