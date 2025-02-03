// routes/folderRoutes.js
const express = require("express");
const {
  createFolder,
  getFolders,
  createSmartFolder,
  getSmartFolderFiles,
} = require("../controllers/folderController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", authMiddleware, createFolder);
router.get("/", authMiddleware, getFolders);
router.post("/smart-folder", createSmartFolder);
router.get("/smart-folder/:folderId/files", getSmartFolderFiles);

module.exports = router;
