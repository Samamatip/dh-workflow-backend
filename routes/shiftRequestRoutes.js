const express = require('express');
const router = express.Router();
const { isStaff, isAdmin } = require('../Auth/authMiddleware');
const {
  createShiftRequest,
  getAllShiftRequests,
  getShiftRequestsByUser,
  reviewShiftRequest,
  deleteShiftRequest
} = require('../controllers/shiftRequestController');

// POST /api/shift-requests - Create a new shift request (backdoor request)
router.post('/', isStaff, createShiftRequest);

// GET /api/shift-requests - Get all shift requests (admin)
// Query params: ?status=pending&date=YYYY-MM
router.get('/', isStaff, isAdmin, getAllShiftRequests);

// GET /api/shift-requests/user/:userId - Get shift requests by user
// Query params: ?status=pending
router.get('/user/:userId', isStaff, getShiftRequestsByUser);

// PUT /api/shift-requests/:requestId/review - Approve or reject a shift request
router.put('/:requestId/review', isStaff, isAdmin, reviewShiftRequest);

// DELETE /api/shift-requests/:requestId - Delete a shift request
router.delete('/:requestId', isStaff, isAdmin, deleteShiftRequest);

module.exports = router;
