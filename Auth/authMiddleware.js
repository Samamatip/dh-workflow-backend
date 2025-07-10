const jwt = require('jsonwebtoken'); //import JWT
require('dotenv').config(); //congigure environment variables
const UserModel = require("../models/userSchema"); 

// Middleware to verify the token and attach the user or admin to the request
exports.isStaff = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        const token = req.headers.authorization.split(' ')[1]; //split token from request header
        
        if (!token) {
            return res.status(401).send('Access denied, please login');
        };

        try {
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET); //verify token with the secret jwt key

            // if the verification is successful, fetch the user from dataBase
            if (decoded && decoded.id) {

                const user = await UserModel.findById(decoded.id).select('-password').populate('department', 'name'); //fetch userData minus password and populate department
                    
                if (!user) {
                return res.status(404).json({ message: 'Not authorized, user not found' });
                }

                // Check if the token was issued before the user logged out of all devices
                //if (user.loggedOutOfAllDevices && decoded.issuedAt * 1000 < user.loggedOutOfAllDevices.getTime()) {
                //return res.status(401).send('Invalid authorization. You have logged out from all devices.');
                //}

                req.user = user;
                next(); //call next middleware if user is found
                
            } else {
                return res.status(401).json({ message: 'Authorization cannot be verified, please login again' });
            };

        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ message: 'Not authorized, authorization failed' });
        }
    } else {
        return res.status(401).json({ message: 'No authorization found in request' });
    }
};

// Middleware to check if the authenticated user is an admin
exports.isAdmin = async (req, res, next) => {
    if (req.user?.role && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Not authorized, admin access is required' });
    }
};