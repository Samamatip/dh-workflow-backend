const Shifts = require('../models/shiftsSchema');
const mongoose = require('mongoose');
const User = require('../models/userSchema');

// Staff books a shift (add new status entry with 'pending' status)
exports.bookShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { userId, isBackdoorRequest = false } = req.body;
    
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

    // Check if user has already booked this shift
    const existingBooking = shift.status.find(statusEntry => 
      statusEntry.by && statusEntry.by.toString() === userId && 
      ['pending', 'approved'].includes(statusEntry.status)
    );
    
    if (existingBooking) {
      return res.status(400).json({ 
        message: `You already have a ${existingBooking.status} booking for this shift.` 
      });
    }

    // Check if there are available slots
    const bookedSlots = shift.status.filter(statusEntry => 
      ['pending', 'approved'].includes(statusEntry.status)
    ).length;
    
    if (bookedSlots >= shift.quantity) {
      return res.status(400).json({ message: 'No available slots for this shift.' });
    }

    // Add new status entry for this user
    shift.status.push({
      status: 'pending',
      by: userId,
      isBackdoorRequest,
      bookedAt: new Date()
    });

    await shiftDoc.save();
    
    // Populate user data for response
    await shiftDoc.populate('shifts.status.by', 'fullName email');
    
    res.status(200).json({ 
      message: 'Shift booked successfully', 
      data: shift 
    });
  } catch (error) {
    console.error('Error booking shift:', error);
    res.status(500).json({ message: 'Error booking shift', error });
  }
};

// Admin approves a specific user's booking for a shift
exports.approveShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { userId, reviewerId } = req.body;
    
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

    // Find the user's pending booking
    const userBooking = shift.status.find(statusEntry => 
      statusEntry.by && statusEntry.by.toString() === userId && 
      statusEntry.status === 'pending'
    );
    
    if (!userBooking) {
      return res.status(400).json({ 
        message: 'No pending booking found for this user on this shift.' 
      });
    }

    // Update the user's booking to approved
    userBooking.status = 'approved';
    userBooking.reviewedAt = new Date();
    if (reviewerId) {
      userBooking.reviewedBy = reviewerId;
    }

    await shiftDoc.save();
    
    // Populate user data for response
    await shiftDoc.populate('shifts.status.by', 'fullName email');
    await shiftDoc.populate('shifts.status.reviewedBy', 'fullName email');
    
    res.status(200).json({ 
      message: 'Shift approved successfully', 
      data: shift 
    });
  } catch (error) {
    console.error('Error approving shift:', error);
    res.status(500).json({ message: 'Error approving shift', error });
  }
};

// Reject a specific user's booking for a shift (admin only)
exports.rejectShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { userId, reason, reviewerId } = req.body;
    
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

    // Find the user's pending booking
    const userBooking = shift.status.find(statusEntry => 
      statusEntry.by && statusEntry.by.toString() === userId && 
      statusEntry.status === 'pending'
    );
    
    if (!userBooking) {
      return res.status(400).json({ 
        message: 'No pending booking found for this user on this shift.' 
      });
    }

    // Update the user's booking to rejected
    userBooking.status = 'rejected';
    userBooking.rejectionReason = reason || 'No reason provided'; // Store reason in status entry too
    userBooking.reviewedAt = new Date();
    if (reviewerId) {
      userBooking.reviewedBy = reviewerId;
    }
    
    // Add to rejection history
    if (!shift.rejectionHistory) {
      shift.rejectionHistory = [];
    }
    shift.rejectionHistory.push({
      userId: userId,
      reason: reason || 'No reason provided',
      rejectedAt: new Date(),
      rejectedBy: reviewerId || null
    });

    await shiftDoc.save();
    
    // Populate user data for response
    await shiftDoc.populate('shifts.status.by', 'fullName email');
    await shiftDoc.populate('shifts.status.reviewedBy', 'fullName email');
    
    res.status(200).json({ 
      message: 'Shift rejected successfully', 
      data: shift 
    });
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
      status: shift.status || [], // Initialize empty status array
      rejectionHistory: shift.rejectionHistory || []
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
    let approvedShifts = [];

    // Collect all approved shifts for the user in the month
    for (const doc of allShiftsDocs) {
      const userApprovedShifts = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        const inDate = shiftDate >= startDate && shiftDate < endDate;
        
        // Check if user has an approved booking for this shift
        const userApprovedBooking = shift.status.find(statusEntry => 
          statusEntry.by && statusEntry.by.toString() === userId && 
          statusEntry.status === 'approved'
        );
        
        return inDate && userApprovedBooking;
      }).map(shift => ({
        ...shift.toObject(),
        department: {
          _id: doc.department._id,
          name: doc.department.name
        }
      }));
      
      approvedShifts.push(...userApprovedShifts);
    }

    // Populate user data
    for (const doc of allShiftsDocs) {
      await doc.populate('shifts.status.by', 'fullName email');
      await doc.populate('shifts.status.reviewedBy', 'fullName email');
    }

    console.log('Approved shifts found:', approvedShifts.length); // Debug log

    res.status(200).json({
      message: 'Approved shifts fetched successfully',
      data: approvedShifts
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
      const isInDateRange = shiftDate >= startDate && shiftDate < endDate;
      const isPublished = shift.published === true;
      
      // Count taken slots (pending + approved)
      const takenSlots = shift.status.filter(statusEntry => 
        ['pending', 'approved'].includes(statusEntry.status)
      ).length;
      
      const hasAvailableSlots = takenSlots < shift.quantity;
      
      // Check if user hasn't already booked this shift
      const userHasntBooked = !shift.status.some(statusEntry => 
        statusEntry.by && statusEntry.by.toString() === userId && 
        ['pending', 'approved'].includes(statusEntry.status)
      );
      
      return isPublished && isInDateRange && hasAvailableSlots && userHasntBooked;
    });

    res.status(200).json({
      message: 'Available published shifts fetched successfully',
      data: availableShifts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching available published shifts', error });
  }
};


// Function to fetch all published and available shifts in other departments
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
        const isPublished = shift.published === true;
        
        // Count taken slots (pending + approved)
        const takenSlots = shift.status.filter(statusEntry => 
          ['pending', 'approved'].includes(statusEntry.status)
        ).length;
        
        const hasSlots = takenSlots < shift.quantity;
        
        // Check if user hasn't already booked this shift
        const userHasntBooked = !shift.status.some(statusEntry => 
          statusEntry.by && statusEntry.by.toString() === userId && 
          ['pending', 'approved'].includes(statusEntry.status)
        );
        
        console.log('Shift check:', {
          published: isPublished,
          isInRange,
          hasSlots,
          userHasntBooked,
          takenSlots,
          quantity: shift.quantity,
          date: shift.date
        }); // Debug log
        
        return isPublished && isInRange && hasSlots && userHasntBooked;
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
        const isInDateRange = shiftDate >= startDate && shiftDate < endDate;
        const isPublished = shift.published === true;
        
        // Check if shift has any pending bookings
        const hasPendingBookings = shift.status.some(statusEntry => 
          statusEntry.status === 'pending'
        );
        
        return isPublished && isInDateRange && hasPendingBookings;
      });
      
      // For each shift with pending bookings, create entries for each pending user
      for (const shift of shifts) {
        const pendingBookings = shift.status.filter(statusEntry => 
          statusEntry.status === 'pending'
        );
        
        for (const booking of pendingBookings) {
          pendingShifts.push({
            ...shift.toObject(),
            department: {
              _id: doc.department._id,
              name: doc.department.name
            },
            pendingBooking: booking // Include the specific pending booking info
          });
        }
      }
    }

    // Populate user data
    for (const doc of allShiftsDocs) {
      await doc.populate('shifts.status.by', 'fullName email');
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
        const isInDateRange = shiftDate >= startDate && shiftDate < endDate;
        const isPublished = shift.published === true;
        
        // Check if user has a pending booking for this shift
        const userPendingBooking = shift.status.find(statusEntry => 
          statusEntry.by && statusEntry.by.toString() === userId && 
          statusEntry.status === 'pending'
        );
        
        return isPublished && isInDateRange && userPendingBooking;
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
        const isPublished = shift.published === true;
        
        // Check if user has a pending booking for this shift
        const userPendingBooking = shift.status.find(statusEntry => 
          statusEntry.by && statusEntry.by.toString() === userId && 
          statusEntry.status === 'pending'
        );
        
        return isPublished && inDate && userPendingBooking;
      }).map(shift => ({
        ...shift.toObject(),
        department: {
          _id: doc.department._id,
          name: doc.department.name
        },
        type: 'pending'
      }));

      // Get user's rejected shifts from status array
      const rejectedFromStatus = doc.shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        const inDate = shiftDate >= startDate && shiftDate < endDate;
        const isPublished = shift.published === true;
        
        // Check if user has a rejected booking for this shift
        const userRejectedBooking = shift.status.find(statusEntry => 
          statusEntry.by && statusEntry.by.toString() === userId && 
          statusEntry.status === 'rejected' &&
          statusEntry.reviewedAt >= startDate && statusEntry.reviewedAt < endDate
        );
        
        return isPublished && inDate && userRejectedBooking;
      }).map(shift => {
        const userRejectedBooking = shift.status.find(statusEntry => 
          statusEntry.by && statusEntry.by.toString() === userId && 
          statusEntry.status === 'rejected'
        );
        
        return {
          ...shift.toObject(),
          department: {
            _id: doc.department._id,
            name: doc.department.name
          },
          type: 'rejected',
          rejectionReason: (() => {
            // First try to get reason from the status entry itself
            if (userRejectedBooking?.rejectionReason) {
              return userRejectedBooking.rejectionReason;
            }
            // Fall back to rejection history for this user
            const userRejection = shift.rejectionHistory?.find(rejection => 
              rejection.userId && rejection.userId.toString() === userId
            );
            return userRejection ? userRejection.reason : 'No reason provided';
          })(),
          rejectedAt: userRejectedBooking?.reviewedAt || null,
          rejectedBy: userRejectedBooking?.reviewedBy || null
        };
      });

      // Get shifts where this user was rejected in the current month (from rejection history)
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
      rejectedShifts.push(...rejectedFromStatus, ...shiftsWithRejections);
    }

    // Combine pending and rejected shifts and deduplicate by shift ID and type
    const combinedShifts = [...userShifts, ...rejectedShifts];
    const deduplicatedShifts = combinedShifts.filter((shift, index, array) => {
      return index === array.findIndex(s => s._id.toString() === shift._id.toString() && s.type === shift.type);
    });
    
    res.status(200).json({
      message: 'Pending shifts and rejection history fetched successfully',
      data: deduplicatedShifts
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
      
      // Count available slots and calculate requests/pending
      for (const shift of monthShifts) {
        const pendingBookings = shift.status.filter(statusEntry => statusEntry.status === 'pending').length;
        const approvedBookings = shift.status.filter(statusEntry => statusEntry.status === 'approved').length;
        const totalBookings = pendingBookings + approvedBookings;
        
        // Available slots = total quantity - booked slots
        availableSlots += Math.max(0, shift.quantity - totalBookings);
        
        // Total requests = all pending + approved bookings
        totalRequests += totalBookings;
        
        // Pending approvals = pending bookings
        pendingApprovals += pendingBookings;
      }
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

// User cancels their own pending booking
exports.cancelUserBooking = async (req, res) => {
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

    // Find the user's pending booking
    const userBookingIndex = shift.status.findIndex(statusEntry => 
      statusEntry.by && statusEntry.by.toString() === userId && 
      statusEntry.status === 'pending'
    );
    
    if (userBookingIndex === -1) {
      return res.status(400).json({ 
        message: 'No pending booking found for this user on this shift.' 
      });
    }

    // Remove the user's booking
    shift.status.splice(userBookingIndex, 1);

    await shiftDoc.save();
    
    res.status(200).json({ 
      message: 'Booking canceled successfully', 
      data: shift 
    });
  } catch (error) {
    console.error('Error canceling booking:', error);
    res.status(500).json({ message: 'Error canceling booking', error });
  }
};


