require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.generateToken = (user, tokenExpiration) => {
  const payload = {
    id: user._id,
    role: user.role,
    issuedAt: Math.floor(Date.now() / 1000), // Issued at time (in seconds)
  };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: tokenExpiration });
};