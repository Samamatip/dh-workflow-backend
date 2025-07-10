require("dotenv").config();
const bcrypt = require("bcryptjs"); // Import bcrypt for password hashing
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userSchema"); // Import the user model
const { generateToken } = require("../utlities/generateToken");

//function to login user
exports.userLogin = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  // Check if identifier (email or phone number) and password are provided
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please enter your valid email and password" });
  }

  try {
    
    const user = await UserModel.findOne({ email: email.toLowerCase() }).populate('department', 'name');
    
    if (!user) {
      console.log("User not found in database");
      return res.status(401).send({ message: "Invalid user email." });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);

    // Check if password is correct
    if (!passwordMatch) {
      return res.status(401).send({ message: "Invalid password." });
    }

    // If user request remember me, set the token expiration to 30 days
    const tokenExpiration = rememberMe ? "30d" : "1h";

    // Generate token and send to user and update lastLoggedIn
    user.lastLoggedIn = Date.now();
    await user.save();

    return res.status(200).send({
      message: "User logged in successfully",
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department ? {
            _id: user.department._id,
            name: user.department.name
          } : null,
        },
        token: generateToken(user._id, tokenExpiration), // Generate token with expiration
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res
      .status(500)
      .send({ message: "An error occurred while logging in" });
  }
};


//function to get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = req.user; // The user is already attached to the request by the auth middleware

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Populate department information
    await user.populate('department', 'name');

    return res.status(200).send({ 
      message: "User profile fetched successfully",
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department ? {
          _id: user.department._id,
          name: user.department.name
        } : null,
        profilePictureUrl: user.profilePictureUrl, // Include profile picture URL if available
      }
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).send({ message: "An error occurred while fetching profile" });
  }
};