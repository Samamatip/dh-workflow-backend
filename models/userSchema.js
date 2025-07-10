const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator"); // Include validator for better validation handling
const { required } = require("joi");


const User = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: [validator.isEmail, "Please enter a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          return /\d{10}/.test(v); // Simple validation for 10-digit phone numbers
        },
        message: "Please enter a valid phone number",
      },
    },
    password: {
      type: String,
      required: false,
    },
    passwordHistory: [{ type: String }],
    lastPasswordChange: {
      type: Date,
      default: null,
    },
    profilePictureUrl: {
      type: String,
    },
    key: {
      type: String, //this is the key for the profile picture
    },
    group: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group", //referencce to unit of branch schema
      },
    ],
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department", //reference to department schema
    },
    role: {
      type: String,
      enum: ["admin", "staff"],
      required: true,
    },
    lastLoggedIn: {
      type: Date,
    },
    loggedOutOfAllDevices: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

//use a presave method to hash password before saving
User.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
}); //this is to hash the password before saving

module.exports = mongoose.models.User || mongoose.model("User", User);