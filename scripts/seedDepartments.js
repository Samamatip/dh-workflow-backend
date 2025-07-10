const mongoose = require('mongoose');
const Department = require('../models/departmentSchema');
const connectToDb = require('../DB/DB');

// Edit this array to add department names you want to seed
const departmentNames = [
    'Arthur',
    'Mews',
    'Transitions',
];

async function seedDepartments() {
    try {
        await connectToDb();
        for (const name of departmentNames) {
            // Check if department already exists
            const exists = await Department.findOne({ name });
            if (!exists) {
                await Department.create({ name });
                console.log(`Created department: ${name}`);
            } else {
                console.log(`Department already exists: ${name}`);
            }
        }
        console.log('Department seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding departments:', error);
        process.exit(1);
    }
}

seedDepartments();
