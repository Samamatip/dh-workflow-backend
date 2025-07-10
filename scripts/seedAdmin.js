const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userSchema');
const connectToDb = require('../DB/DB');

const adminData = {
    fullName: 'Admin User',
    email: 'admin@gmail.com',
    password: 'AdminPassword123', // Plain text - let the schema hash it
    role: 'admin',
};

async function seedAdminUser() {
    try {
        await connectToDb();

        // Delete the existing admin user first
        const deletedUser = await User.deleteOne({ email: adminData.email });
        console.log(`Deleted existing admin:`, deletedUser.deletedCount > 0 ? 'Yes' : 'No existing admin found');

        // Create new admin user - let the schema pre-save hook handle hashing
        const adminUser = new User({
            fullName: adminData.fullName,
            email: adminData.email.toLowerCase(),
            password: adminData.password, // Plain text password
            role: adminData.role,
        });

        await adminUser.save();
        console.log('Admin user created successfully with schema hashing.');
        
        // Verify the admin user was created
        const verifyUser = await User.findOne({ email: adminData.email });
        console.log('Verification - Admin exists:', verifyUser ? 'Yes' : 'No');
        console.log('Verification - Role is admin:', verifyUser?.role === 'admin' ? 'Yes' : 'No');
        console.log('Verification - Password is hashed:', verifyUser?.password?.startsWith('$2b$') ? 'Yes' : 'No');
        
        console.log(`\nAdmin Login Credentials:`);
        console.log(`Email: ${adminData.email}`);
        console.log(`Password: ${adminData.password}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

seedAdminUser();
