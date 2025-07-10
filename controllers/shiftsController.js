const Shifts = require('../models/shiftsSchema');
const mongoose = require('mongoose');
const User = require('../models/userSchema');

// Staff books a shift (set status to 'pending' and add user to takenBy)
exports.bookShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { userId } = req.body;
    if (!shiftId || !userId) {
      return res.status(400).json({ message: 'shiftId and userId are required.' });
    }

    // Find the shift document containing the shift
    const shiftDoc = await Shifts.findOne({ 'shifts._id': shiftId });
    if (!shiftDoc) {
      return res.status(404).json({ message: 'Shift not found.' });
    }

    // Find the shift in the array
    const shift = shiftDoc.shifts.id(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found in document.' });
    }

    // Only allow booking if available
    if (shift.status.status !== 'available') {
      return res.status(400).json({ message: 'Shift is not available for booking.' });
    }

    shift.status.status = 'pending';
    shift.status.by = userId;
    shift.takenBy.push(userId);
    shift.slotsTaken += 1;

    await shiftDoc.save();
    res.status(200).json({ message: 'Shift booked successfully', data: shift });
  } catch (error) {
    res.status(500).json({ message: 'Error booking shift', error });
  }
};

// Admin approves a booked shift (set status to 'approved')
exports.approveShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    if (!shiftId) {
      return res.status(400).json({ message: 'shiftId is required.' });
    }

    // Find the shift document containing the shift
    const shiftDoc = await Shifts.findOne({ 'shifts._id': shiftId });
    if (!shiftDoc) {
      return res.status(404).json({ message: 'Shift not found.' });
    }

    // Find the shift in the array
    const shift = shiftDoc.shifts.id(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found in document.' });
    }

    // Only allow approval if pending
    if (shift.status.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending shifts can be approved.' });
    }

    shift.status.status = 'approved';
    await shiftDoc.save();
    res.status(200).json({ message: 'Shift approved successfully', data: shift });
  } catch (error) {
    res.status(500).json({ message: 'Error approving shift', error });
  }
};

// Reject a shift (admin only)
exports.rejectShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { reason } = req.body;
    
    if (!shiftId) {
      return res.status(400).json({ message: 'shiftId is required.' });
    }

    // Find the shift document containing the shift
    const shiftDoc = await Shifts.findOne({ 'shifts._id': shiftId });
    if (!shiftDoc) {
      return res.status(404).json({ message: 'Shift not found.' });
    }

    // Find the shift in the array
    const shift = shiftDoc.shifts.id(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found in document.' });
    }

    // Only allow rejection if pending
    if (shift.status.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending shifts can be rejected.' });
    }

    // Store the user who booked the shift before clearing
    const rejectedUserId = shift.status.by;
    
    // Reset the shift to available status and clear the booking
    shift.status.status = 'available';
    shift.status.by = null;
    shift.slotsTaken = Math.max(0, shift.slotsTaken - 1);
    shift.takenBy = shift.takenBy.filter(userId => userId.toString() !== rejectedUserId?.toString());
    
    // Add to rejection history
    if (!shift.rejectionHistory) {
      shift.rejectionHistory = [];
    }
    shift.rejectionHistory.push({
      userId: rejectedUserId,
      reason: reason || 'No reason provided',
      rejectedAt: new Date(),
      rejectedBy: req.user?._id || null // Admin who rejected (if available in req.user)
    });

    await shiftDoc.save();
    res.status(200).json({ message: 'Shift rejected successfully', data: shift });
  } catch (error) {
    console.error('Error rejecting shift:', error);
    res.status(500).json({ message: 'Error rejecting shift', error });
  }
};

// GET published shifts by department and month (date in format YYYY-MM)
exports.getPublishedShiftsByDepartmentAndMonth = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { date } = req.query; // expects 'YYYY-MM'
    if (!departmentId || !date) {
      return res.status(400).json({ message: 'departmentId and date (YYYY-MM) are required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find the shifts document for the department
    const shiftsDoc = await Shifts.findOne({ department: departmentId }).populate('department', 'name');
    if (!shiftsDoc) {
      return res.status(404).json({ message: 'No shifts found for this department In this period' });
    }

    // Filter shifts within the month
    const filteredShifts = shiftsDoc.shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      const inDate =  shiftDate >= startDate && shiftDate < endDate;
      const isPublished = shift.published === true;
      return inDate && isPublished;
    });

    res.status(200).json({
        message: 'Shifts fetched successfully',
        data:{
            department: {
                _id: shiftsDoc.department._id,
                name: shiftsDoc.department.name,
            },
            shift: filteredShifts,
        }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shifts', error });
  }
};

//GET unpublished shifts by department and month (date in format YYYY-MM)
exports.getunPublishedShiftsByDepartmentAndMonth = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { date } = req.query; // expects 'YYYY-MM'
    if (!departmentId || !date) {
      return res.status(400).json({ message: 'departmentId and date (YYYY-MM) are required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find the shifts document for the department
    const shiftsDoc = await Shifts.findOne({ department: departmentId }).populate('department', 'name');
    if (!shiftsDoc) {
      return res.status(404).json({ message: 'No shifts found for this department In this period' });
    }

    // Filter shifts within the month
    const filteredShifts = shiftsDoc.shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      const inDate =  shiftDate >= startDate && shiftDate < endDate;
      const isNotPublished = shift.published === false || null || '';
      return inDate && isNotPublished;
    });

    res.status(200).json({
        message: 'Shifts fetched successfully',
        data:{
            department: {
                _id: shiftsDoc.department._id,
                name: shiftsDoc.department.name,
            },
            shift: filteredShifts,
        }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shifts', error });
  }
};

// POST create or update shifts for a department (single or bulk)
exports.createShifts = async (req, res) => {
  try {
    let { department, shift } = req.body;
    if (!department || !shift) {
      return res.status(400).json({ message: 'department and shift are required.' });
    }

    // Normalize to array for bulk or single
    const shiftsArray = Array.isArray(shift) ? shift : [shift];

    console.log('shifts:', shiftsArray)
    // Validate each shift
    for (const s of shiftsArray) {
      if (!s.date || !s.startTime || !s.endTime || !s.quantity || s.quantity < 1) {
        return res.status(400).json({ message: 'Each shift must have date, startTime, endTime, and atlease 1 slot.' });
      }
    }

    // Find or create the shifts document for the department
    let shiftsDoc = await Shifts.findOne({ department });
    if (!shiftsDoc) {
      shiftsDoc = new Shifts({ department, shifts: [] });
    }

    // Add new shifts with proper defaults
    const normalizedShifts = shiftsArray.map(shift => ({
      ...shift,
      published: shift.published !== undefined ? shift.published : true, // Default to published for demo
      status: shift.status || { status: 'available' },
      slotsTaken: shift.slotsTaken || 0,
      takenBy: shift.takenBy || []
    }));
    
    shiftsDoc.shifts.push(...normalizedShifts);
    await shiftsDoc.save();

    res.status(201).json({
      message: 'Shift(s) created successfully',
      data: normalizedShifts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating shift(s)', error });
  }
};

// Get approved shifts by userId and date
exports.getApprovedShiftsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // expects 'YYYY-MM'

    if (!userId || !date) {
      return res.status(400).json({ message: 'userId and date (YYYY-MM) are required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find all shifts documents
    const allShiftsDocs = await Shifts.find().populate('department', 'name');
    let filteredShifts = [];

    // Collect all approved shifts for the user in the month
    for (const doc of allShiftsDocs) {
      const userShifts = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        const inDate = shiftDate >= startDate && shiftDate < endDate;
        const isUserShift = shift.takenBy && shift.takenBy.some(userId_ref => userId_ref.toString() === userId);
        const isApproved = shift.status.status === 'approved';
        return inDate && isUserShift && isApproved;
      });
      
      // Populate user data for each shift
      if (userShifts.length > 0) {
        await doc.populate('shifts.takenBy', 'fullName email');
        await doc.populate('shifts.status.by', 'fullName email');
        
        const shiftsWithDepartment = userShifts.map(shift => ({
          ...shift.toObject(),
          department: {
            _id: doc.department._id,
            name: doc.department.name
          }
        }));
        filteredShifts.push(...shiftsWithDepartment);
      }
    }

    console.log('Approved shifts found:', filteredShifts.length); // Debug log

    res.status(200).json({
      message: 'Approved shifts fetched successfully',
      data: filteredShifts
    });

  } catch (error) {
    console.error('Error in getApprovedShiftsByUser:', error);
    res.status(500).json({ message: 'Error fetching approved shifts', error });
  }
};

// Function to fetch all published and available shifts in a user's department
exports.getAvailablePublishedShiftsByUserDepartment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // expects 'YYYY-MM'
    if (!userId || !date) {
      return res.status(400).json({ message: 'userId and date (YYYY-MM) are required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find the user's department
    const user = await User.findById(userId);
    if (!user || !user.department) {
      return res.status(404).json({ message: 'User or user department not found.' });
    }

    // Find the shifts document for the user's department
    const shiftsDoc = await Shifts.findOne({ department: user.department }).populate('department', 'name');

    if (!shiftsDoc) {
      return res.status(404).json({ message: 'No shifts found for this department.' });
    }

    // Filter published and available shifts within the month
    const availableShifts = shiftsDoc.shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return (
        shift.published === true &&
        shift.status.status === 'available' &&
        shift.slotsTaken < shift.quantity && // Available slots check
        shiftDate >= startDate && shiftDate < endDate
      );
    });

    res.status(200).json({
      message: 'Available published shifts fetched successfully',
      data: availableShifts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching available published shifts', error });
  }
};


// Function to fetch all published and available shifts in a user's department
exports.getAvailablePublishedShiftsByOtherDepartment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // expects 'YYYY-MM'
    console.log('Request params:', { userId, date }); // Debug log
    
    if (!userId || !date) {
      return res.status(400).json({ message: 'userId and date (YYYY-MM) are required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    console.log('Date range:', { startDate, endDate }); // Debug log

    // Find the user's department
    const user = await User.findById(userId).select('department');
    if (!user || !user.department) {
      console.log('User not found or no department:', user); // Debug log
      return res.status(404).json({ message: 'User or user department not found.' });
    }
    console.log('User department:', user.department); // Debug log

    // Find all shifts documents except the user's department
    const otherShiftsDocs = await Shifts.find({ department: { $ne: user.department } }).populate('department', 'name');
    console.log('Other departments count:', otherShiftsDocs.length); // Debug log
    
    if (!otherShiftsDocs.length) {
      return res.status(404).json({ message: 'No shifts found for other departments.' });
    }

    // Collect all published and available shifts within the month from other departments
    let availableShifts = [];
    for (const doc of otherShiftsDocs) {
      const shifts = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        const isInRange = shiftDate >= startDate && shiftDate < endDate;
        const hasSlots = shift.slotsTaken < shift.quantity;
        console.log('Shift check:', {
          published: shift.published,
          status: shift.status.status,
          isInRange,
          hasSlots,
          slotsTaken: shift.slotsTaken,
          quantity: shift.quantity,
          date: shift.date
        }); // Debug log
        return (
          shift.published === true &&
          shift.status.status === 'available' &&
          shift.slotsTaken < shift.quantity && // Available slots check
          shiftDate >= startDate && shiftDate < endDate
        );
      }).map(shift => ({
        ...shift.toObject(),
        department: {
          _id: doc.department._id,
          name: doc.department.name
        }
      }));
      availableShifts.push(...shifts);
    }

    console.log('Total available shifts found:', availableShifts.length); // Debug log
    res.status(200).json({
      message: 'Available published shifts from other departments fetched successfully',
      data: availableShifts
    });
  } catch (error) {
    console.error('Error in getAvailablePublishedShiftsByOtherDepartment:', error); // Debug log
    res.status(500).json({ message: 'Error fetching available published shifts from other departments', error });
  }
};

// Admin publishes/unpublishes a shift
exports.publishShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { published } = req.body; // true or false
    
    if (!shiftId || published === undefined) {
      return res.status(400).json({ message: 'shiftId and published status are required.' });
    }

    // Find the shift document containing the shift
    const shiftDoc = await Shifts.findOne({ 'shifts._id': shiftId });
    if (!shiftDoc) {
      return res.status(404).json({ message: 'Shift not found.' });
    }

    // Find the shift in the array
    const shift = shiftDoc.shifts.id(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found in document.' });
    }

    shift.published = published;
    await shiftDoc.save();
    
    res.status(200).json({ 
      message: `Shift ${published ? 'published' : 'unpublished'} successfully`, 
      data: shift 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error publishing shift', error });
  }
};

// Admin gets pending shifts across all departments
exports.getPendingShifts = async (req, res) => {
  try {
    const { date } = req.query; // expects 'YYYY-MM'
    if (!date) {
      return res.status(400).json({ message: 'date (YYYY-MM) is required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find all shifts documents
    const allShiftsDocs = await Shifts.find().populate('department', 'name');
    let pendingShifts = [];

    // Collect all pending shifts across departments
    for (const doc of allShiftsDocs) {
      const shifts = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return (
          shift.published === true &&
          shift.status.status === 'pending' &&
          shiftDate >= startDate && shiftDate < endDate
        );
      });
      
      // Populate user data for each shift
      await doc.populate('shifts.status.by', 'fullName email');
      await doc.populate('shifts.takenBy', 'fullName email');
      
      const shiftsWithDepartment = shifts.map(shift => ({
        ...shift.toObject(),
        department: {
          _id: doc.department._id,
          name: doc.department.name
        }
      }));
      pendingShifts.push(...shiftsWithDepartment);
    }

    res.status(200).json({
      message: 'Pending shifts fetched successfully',
      data: pendingShifts
    });
  } catch (error) {
    console.error('Error in getPendingShifts:', error);
    res.status(500).json({ message: 'Error fetching pending shifts', error });
  }
};

// Get pending shifts by user ID
exports.getPendingShiftsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // expects 'YYYY-MM'
    if (!userId || !date) {
      return res.status(400).json({ message: 'userId and date (YYYY-MM) are required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find all shifts documents
    const allShiftsDocs = await Shifts.find().populate('department', 'name');
    let pendingShifts = [];

    // Collect all pending shifts for the user in the month
    for (const doc of allShiftsDocs) {
      const userPendingShifts = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return (
          shift.published === true &&
          shift.status.status === 'pending' &&
          shift.takenBy.includes(userId) &&
          shiftDate >= startDate && shiftDate < endDate
        );
      }).map(shift => ({
        ...shift.toObject(),
        department: {
          _id: doc.department._id,
          name: doc.department.name
        }
      }));
      pendingShifts.push(...userPendingShifts);
    }

    res.status(200).json({
      message: 'Pending shifts fetched successfully',
      data: pendingShifts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending shifts', error });
  }
};

// Get pending shifts and rejection history by user ID
exports.getPendingShiftsAndRejectionHistoryByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // expects 'YYYY-MM'
    if (!userId || !date) {
      return res.status(400).json({ message: 'userId and date (YYYY-MM) are required.' });
    }

    console.log('Fetching pending and rejection history for user:', userId, 'date:', date);

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find all shifts documents
    const allShiftsDocs = await Shifts.find().populate('department', 'name');
    let userShifts = [];
    let rejectedShifts = [];

    // Collect all pending shifts and rejection history for the user in the month
    for (const doc of allShiftsDocs) {
      // Get pending shifts for this user
      const pendingShifts = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        const inDate = shiftDate >= startDate && shiftDate < endDate;
        const isPending = shift.status.status === 'pending';
        const isUserShift = shift.takenBy.includes(userId);
        const isPublished = shift.published === true;
        
        return isPublished && isPending && isUserShift && inDate;
      }).map(shift => ({
        ...shift.toObject(),
        department: {
          _id: doc.department._id,
          name: doc.department.name
        },
        type: 'pending'
      }));

      // Get shifts where this user was rejected in the current month
      const shiftsWithRejections = doc.shifts.filter(shift => {
        const hasRejectionHistory = shift.rejectionHistory && shift.rejectionHistory.length > 0;
        const isPublished = shift.published === true;
        
        if (!hasRejectionHistory || !isPublished) {
          return false;
        }
        
        const userRejection = shift.rejectionHistory.find(rejection => 
          rejection.userId && rejection.userId.toString() === userId
        );
        
        if (!userRejection) {
          return false;
        }
        
        const rejectionDate = new Date(userRejection.rejectedAt);
        const rejectionInRange = rejectionDate >= startDate && rejectionDate < endDate;
        
        return rejectionInRange;
      }).map(shift => {
        // Find the rejection for this user
        const userRejection = shift.rejectionHistory.find(rejection => 
          rejection.userId && rejection.userId.toString() === userId
        );
        return {
          ...shift.toObject(),
          department: {
            _id: doc.department._id,
            name: doc.department.name
          },
          type: 'rejected',
          rejectionReason: userRejection ? userRejection.reason : 'No reason provided',
          rejectedAt: userRejection ? userRejection.rejectedAt : null,
          rejectedBy: userRejection ? userRejection.rejectedBy : null
        };
      });

      userShifts.push(...pendingShifts);
      rejectedShifts.push(...shiftsWithRejections);
    }

    // Combine pending and rejected shifts
    const allUserShifts = [...userShifts, ...rejectedShifts];
    
    res.status(200).json({
      message: 'Pending shifts and rejection history fetched successfully',
      data: allUserShifts
    });
  } catch (error) {
    console.error('Error in getPendingShiftsAndRejectionHistoryByUser:', error);
    res.status(500).json({ message: 'Error fetching pending shifts and rejection history', error });
  }
};

// Get admin dashboard statistics
exports.getAdminDashboardStats = async (req, res) => {
  try {
    const { date } = req.query; // expects 'YYYY-MM'
    if (!date) {
      return res.status(400).json({ message: 'date (YYYY-MM) is required.' });
    }

    // Parse the start and end of the month
    const [year, month] = date.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find all shifts documents
    const allShiftsDocs = await Shifts.find().populate('department', 'name');
    
    let totalSlotsUploaded = 0;
    let availableSlots = 0;
    let totalRequests = 0;
    let pendingApprovals = 0;

    // Calculate statistics across all departments
    for (const doc of allShiftsDocs) {
      const monthShifts = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= startDate && shiftDate < endDate && shift.published === true;
      });

      // Count total slots uploaded this month
      totalSlotsUploaded += monthShifts.reduce((sum, shift) => sum + shift.quantity, 0);
      
      // Count available slots (published and available with open slots)
      availableSlots += monthShifts
        .filter(shift => shift.status.status === 'available' && shift.slotsTaken < shift.quantity)
        .reduce((sum, shift) => sum + (shift.quantity - shift.slotsTaken), 0);
      
      // Count total requests (approved + pending)
      totalRequests += monthShifts.reduce((sum, shift) => sum + shift.slotsTaken, 0);
      
      // Count pending approvals
      pendingApprovals += monthShifts.filter(shift => shift.status.status === 'pending').length;
    }

    res.status(200).json({
      message: 'Admin dashboard statistics fetched successfully',
      data: {
        totalSlotsUploaded,
        availableSlots,
        totalRequests,
        pendingApprovals,
        month: date
      }
    });
  } catch (error) {
    console.error('Error in getAdminDashboardStats:', error);
    res.status(500).json({ message: 'Error fetching admin dashboard statistics', error });
  }
};


