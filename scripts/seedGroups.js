const mongoose = require('mongoose');
const Group = require('../models/groupSchema');
const connectToDb = require('../DB/DB');

// Edit this array to add group names you want to seed
const groupNames = [
    'Day staff',
    'Night staff',
    'Bank staff Day',
    'Bank staff Night',
];

async function seedGroups() {
    try {
        await connectToDb();
        for (const name of groupNames) {
            // Check if group already exists
            const exists = await Group.findOne({ name });
            if (!exists) {
                await Group.create({ name });
                console.log(`Created group: ${name}`);
            } else {
                console.log(`Group already exists: ${name}`);
            }
        }
        console.log('Group seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding groups:', error);
        process.exit(1);
    }
}

seedGroups();
