const express = require("express");
const router = express.Router();
const { userLogin, getUserProfile } = require("../controllers/authControllers");
const { isStaff } = require("../Auth/authMiddleware");


// Middleware for file upload
//router.use(fileUpload());

router.post("/login", userLogin);
router.get("/user", isStaff, getUserProfile);

module.exports = router;