const express = require('express');
const router = express.Router();
const { isAdmin, isStaff } = require('../Auth/authMiddleware');
const { 
    getPublishedShiftsByDepartmentAndMonth, 
    getunPublishedShiftsByDepartmentAndMonth, 
    getAvailablePublishedShiftsByUserDepartment,
    getAvailablePublishedShiftsByOtherDepartment,
    createShifts,
    getApprovedShiftsByUser,
    bookShift,
    approveShift,
    rejectShift,
    cancelUserBooking,
    publishShift,
    getPendingShifts,
    getPendingShiftsByUser,
    getPendingShiftsAndRejectionHistoryByUser,
    getAdminDashboardStats
} = require('../controllers/shiftsController');
// POST /api/shifts/book/:shiftId - staff books a shift
router.post('/book/:shiftId', isStaff, bookShift);

// POST /api/shifts/cancel/:shiftId - staff cancels their own booking
router.post('/cancel/:shiftId', isStaff, cancelUserBooking);

// POST /api/shifts/approve/:shiftId - admin approves a booked shift
router.post('/approve/:shiftId', isStaff, isAdmin, approveShift);

// POST /api/shifts/reject/:shiftId - admin rejects a booked shift
router.post('/reject/:shiftId', isStaff, isAdmin, rejectShift);

// POST /api/shifts/upload - create single or bulk shifts
router.post('/upload', createShifts);

// POST /api/shifts/publish/:shiftId - admin publishes/unpublishes a shift
router.post('/publish/:shiftId', publishShift);

// GET /api/shifts/pending?date=YYYY-MM - admin gets all pending shifts
router.get('/pending', isStaff, isAdmin, getPendingShifts);

// GET /api/shifts/pending-by-user/:userId?date=YYYY-MM - get pending shifts by user
router.get('/pending-by-user/:userId', getPendingShiftsByUser);

// GET /api/shifts/pending-and-rejected/:userId?date=YYYY-MM - get pending shifts and rejection history by user
router.get('/pending-and-rejected/:userId', getPendingShiftsAndRejectionHistoryByUser);

// GET /api/shifts/available/:userId/?date=YYYY-MM
router.get('/available-my-department/:userId', getAvailablePublishedShiftsByUserDepartment);

// GET /api/shifts/available/other-department/:userId
router.get('/available/other-department/:userId', getAvailablePublishedShiftsByOtherDepartment);

// GET /api/shifts/approved/:userId
router.get('/approved/:userId', getApprovedShiftsByUser);

// GET /api/shifts/admin-dashboard-stats?date=YYYY-MM - admin dashboard statistics
router.get('/admin-dashboard-stats', isStaff, isAdmin, getAdminDashboardStats);

// GET /api/shifts/unpublished/:departmentId?date=YYYY-MM
router.get('/unpublished/:departmentId', getunPublishedShiftsByDepartmentAndMonth);

// GET /api/shifts/:departmentId?date=YYYY-MM - this should be last as it's a catch-all
router.get('/:departmentId', getPublishedShiftsByDepartmentAndMonth);

module.exports = router;
