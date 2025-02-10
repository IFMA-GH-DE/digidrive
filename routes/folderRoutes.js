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
  getSmartFolders,
  deleteFolders,
  getFilesByFolder,
} = require("../controllers/folderController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

//Create Folder
router.post("/create", authMiddleware, createFolder);
//get Folders
router.get("/", authMiddleware, getFolders);

//get SmartFolders
router.get("/smartfolders", authMiddleware, getSmartFolders);

//move Folders
router.put("/move", authMiddleware, moveFolders);

//Make Folder Smart
router.put("/make-smart", authMiddleware, makeSmartFolder);

//Create smart Folder
router.post("/createsmartfolder", authMiddleware, createSmartFolder);

//Get Folder Files
router.get("/files/folder/:folderId", authMiddleware, getFilesByFolder);

//Get SmartFolder Files
router.get(
  "/smart-folder/:folderId/files",
  authMiddleware,
  getSmartFolderFiles
);

//Tag Folder
router.put("/tag", authMiddleware, tagFolders);

// Route to delete multiple folders
router.delete("/delete", authMiddleware, deleteFolders);

module.exports = router;
