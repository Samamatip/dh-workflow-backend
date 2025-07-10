const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userSchema');
const connectToDb = require('../DB/DB');

const userData = {
    fullName: 'Staff 1',
    email: 'examplestaff@gmail.com',
    password: 'StaffPassword123', // Plain text - let the schema hash it
    role: 'staff', 
    department: 'Arthur'
};

async function seedAdminUser() {
    try {
        await connectToDb();

        // Delete the existing user first
        const deletedUser = await User.deleteOne({ email: userData.email });
        console.log(`Deleted existing user:`, deletedUser.deletedCount > 0 ? 'Yes' : 'No existing user found');

        // Create new user - let the schema pre-save hook handle hashing
        const adminUser = new User({
            fullName: userData.fullName,
            email: userData.email.toLowerCase(),
            password: userData.password, // Plain text password
            role: userData.role,
        });

        await adminUser.save();
        console.log('User created successfully with schema hashing.');
        
        // Verify the user was created
        const verifyUser = await User.findOne({ email: userData.email });
        console.log('Verification - User exists:', verifyUser ? 'Yes' : 'No');
        console.log('Verification - Password is hashed:', verifyUser?.password?.startsWith('$2b$') ? 'Yes' : 'No');
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

seedAdminUser();