// routes/folderRoutes.js
const express = require("express");
const {
  createFolder,
  getFolders,
  createSmartFolder,
  getSmartFolderFiles,
  makeSmartFolder,
  tagFolders,
  moveFolders,
} = require("../controllers/folderController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

//Create Folder
router.post("/create", authMiddleware, createFolder);
//get Folders
router.get("/", authMiddleware, getFolders);

//move Folders
router.put("/move", authMiddleware, moveFolders);

//Make Folder Smart
router.put("/make-smart", makeSmartFolder);

//Create smart Folder
router.post("/smart-folder", createSmartFolder);

//Get Folder Files
router.get("/smart-folder/:folderId/files", getSmartFolderFiles);

//Tag Folder
router.put("/tag", tagFolders);

module.exports = router;
