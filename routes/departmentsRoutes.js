const express = require('express');
const router = express.Router();
const { getDepartments } = require('../controllers/departmentControllers');
const { isStaff } = require('../Auth/authMiddleware');


router.get('/', isStaff, getDepartments); // GET /api/departments - fetch all departments

module.exports = router;
