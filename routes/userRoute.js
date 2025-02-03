const express = require("express");
const { getUser, updateUser } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getUser); // Fetch user details
router.put("/me", authMiddleware, updateUser); // Update user

module.exports = router;
