const ShiftRequest = require('../models/shiftRequestSchema');
const User = require('../models/userSchema');
const Department = require('../models/departmentSchema');

// Create a new shift request (backdoor request)
exports.createShiftRequest = async (req, res) => {
  try {
    const { requestedBy, department, date, startTime, endTime, reason } = req.body;

    // Validate required fields
    if (!requestedBy || !department || !date || !startTime || !endTime || !reason) {
      return res.status(400).json({ 
        message: 'All fields are required: requestedBy, department, date, startTime, endTime, reason' 
      });
    }

    // Verify user exists
    const user = await User.findById(requestedBy);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify department exists
    const dept = await Department.findById(department);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Create the shift request
    const shiftRequest = new ShiftRequest({
      requestedBy,
      department,
      date: new Date(date),
      startTime,
      endTime,
      reason,
      status: 'pending',
      isBackdoorRequest: true
    });

    await shiftRequest.save();

    // Populate the response
    await shiftRequest.populate('requestedBy', 'fullName email');
    await shiftRequest.populate('department', 'name');

    res.status(201).json({
      message: 'Shift request created successfully',
      data: shiftRequest
    });
  } catch (error) {
    console.error('Error creating shift request:', error);
    res.status(500).json({ message: 'Error creating shift request', error });
  }
};

// Get all shift requests (for admin)
exports.getAllShiftRequests = async (req, res) => {
  try {
    const { status, date } = req.query;
    
    let filter = { isBackdoorRequest: true };
    
    // Filter by status if provided
    if (status) {
      filter.status = status;
    }
    
    // Filter by date range if provided (YYYY-MM format)
    if (date) {
      const [year, month] = date.split('-');
      const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      filter.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const shiftRequests = await ShiftRequest.find(filter)
      .populate('requestedBy', 'fullName email')
      .populate('department', 'name')
      .populate('reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Shift requests fetched successfully',
      data: shiftRequests
    });
  } catch (error) {
    console.error('Error fetching shift requests:', error);
    res.status(500).json({ message: 'Error fetching shift requests', error });
  }
};

// Get shift requests by user
exports.getShiftRequestsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let filter = { requestedBy: userId, isBackdoorRequest: true };
    
    if (status) {
      filter.status = status;
    }

    const shiftRequests = await ShiftRequest.find(filter)
      .populate('department', 'name')
      .populate('reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'User shift requests fetched successfully',
      data: shiftRequests
    });
  } catch (error) {
    console.error('Error fetching user shift requests:', error);
    res.status(500).json({ message: 'Error fetching user shift requests', error });
  }
};

// Approve or reject a shift request
exports.reviewShiftRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminNotes, reviewedBy } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either "approved" or "rejected"' });
    }

    // Find the shift request
    const shiftRequest = await ShiftRequest.findById(requestId);
    if (!shiftRequest) {
      return res.status(404).json({ message: 'Shift request not found' });
    }

    // Update the shift request
    shiftRequest.status = status;
    shiftRequest.reviewedBy = reviewedBy;
    shiftRequest.reviewedAt = new Date();
    if (adminNotes) {
      shiftRequest.adminNotes = adminNotes;
    }

    // If approved, create an actual shift entry in the Shifts schema
    if (status === 'approved') {
      const Shifts = require('../models/shiftsSchema');
      
      // Find or create a shifts document for this department
      let shiftsDoc = await Shifts.findOne({ department: shiftRequest.department });
      
      if (!shiftsDoc) {
        // Create new shifts document for this department
        shiftsDoc = new Shifts({
          department: shiftRequest.department,
          shifts: []
        });
      }

      // Create the approved shift entry
      const approvedShift = {
        date: shiftRequest.date,
        startTime: shiftRequest.startTime,
        endTime: shiftRequest.endTime,
        quantity: 1, // Backdoor requests are typically for 1 person
        published: true, // Mark as published so it appears in approved shifts
        status: {
          status: 'approved',
          by: shiftRequest.requestedBy
        },
        slotsTaken: 1,
        takenBy: [shiftRequest.requestedBy], // Add the requesting user to takenBy array
        isBackdoorRequest: true // Flag to identify it came from a backdoor request
      };

      // Add the shift to the document
      shiftsDoc.shifts.push(approvedShift);
      await shiftsDoc.save();
    }

    await shiftRequest.save();

    // Populate the response
    await shiftRequest.populate('requestedBy', 'fullName email');
    await shiftRequest.populate('department', 'name');
    await shiftRequest.populate('reviewedBy', 'fullName');

    res.status(200).json({
      message: `Shift request ${status} successfully${status === 'approved' ? ' and shift created' : ''}`,
      data: shiftRequest
    });
  } catch (error) {
    console.error('Error reviewing shift request:', error);
    res.status(500).json({ message: 'Error reviewing shift request', error });
  }
};

// Delete a shift request
exports.deleteShiftRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const shiftRequest = await ShiftRequest.findByIdAndDelete(requestId);
    if (!shiftRequest) {
      return res.status(404).json({ message: 'Shift request not found' });
    }

    res.status(200).json({
      message: 'Shift request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shift request:', error);
    res.status(500).json({ message: 'Error deleting shift request', error });
  }
};
