const Group = require('../models/groupSchema');

// Fetch all groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find();
    if (!groups || groups.length === 0) {
      return res.status(404).json({ message: 'No groups found' });
    }
    res.status(200).json({
        message: 'Groups fetched successfully',
        data: groups    
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups', error });
  }
};
