const mongoose = require('mongoose');
const Department = require('../models/departmentSchema');
const Shifts = require('../models/shiftsSchema');
const connectToDb = require('../DB/DB');

// Example shift data template (customize as needed)
const sampleShifts = [
  {
    date: new Date(),
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    quantity: 3,
  },
  {
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    quantity: 2,
  },
  {
    //next month
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    quantity: 4,
  },
  {
    //next month
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000), // Two days later
    startTime: '11:00 AM',
    endTime: '07:00 PM',
    quantity: 5,
  },
  {
    //next month
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 24 * 60 * 60 * 1000), // Three days later
    startTime: '07:00 AM',
    endTime: '03:00 PM',
    quantity: 6,
  },
];

async function seedShifts() {
  try {
    await connectToDb();
    const departments = await Department.find();
    if (!departments.length) {
      console.log('No departments found. Seed departments first.');
      process.exit(0);
    }
    for (const dept of departments) {
      // Check if shifts already exist for this department
      const exists = await Shifts.findOne({ department: dept._id });
      if (!exists) {
        await Shifts.create({
          department: dept._id,
          shifts: sampleShifts,
        });
        console.log(`Shifts created for department: ${dept.name}`);
      } else {
        console.log(`Shifts already exist for department: ${dept.name}`);
      }
    }
    console.log('Shifts seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding shifts:', error);
    process.exit(1);
  }
}

seedShifts();
