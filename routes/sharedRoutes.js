// routes/shareRoutes.js
const express = require("express");
const {
  createShareLink,
  getSharedLinks,
} = require("../controllers/sharedController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authMiddleware, createShareLink);
router.get("/", authMiddleware, getSharedLinks);

module.exports = router;
