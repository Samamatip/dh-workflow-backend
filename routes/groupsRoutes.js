const express = require('express');
const router = express.Router();
const { getGroups } = require('../controllers/groupControllers');
const { isAdmin, isStaff } = require('../Auth/authMiddleware');

// GET /api/groups - fetch all groups
router.get('/', isStaff, isAdmin, getGroups);

module.exports = router;
