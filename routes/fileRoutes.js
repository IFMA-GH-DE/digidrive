const express = require("express");
const {
  uploadFile,
  getFiles,
  deleteFile,
  linkFiles,
  getRelatedFiles,
  uploadNewVersion,
  getFileVersions,
  updateFile,
  moveFilesToFolder,
  tagFiles,
} = require("../controllers/fileController");
const { updateStorageUsage } = require("../controllers/fileController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const router = express.Router();

// Upload file/s
router.post(
  "/upload",
  authMiddleware, // Authenticate the user
  uploadMiddleware, // Handle file uploads and storage limit check
  updateStorageUsage, // Update storage usage (if applicable)
  uploadFile // Handle the file upload logic
);

//get all files
router.get("/", authMiddleware, getFiles);

//add files to Folder
router.put("/move", authMiddleware, moveFilesToFolder);

//get all files
router.put("/tags", authMiddleware, tagFiles);

//link files
router.put("/link", authMiddleware, linkFiles);
//get related files
router.get("/related/:fileId", getRelatedFiles);

//upload new version
router.post("version/:fileId", uploadNewVersion);

//get file versions
router.get("/versions/:fileId", getFileVersions);

/* //update file
router.put("/:fileId", authMiddleware, updateFile); */

//delete file
router.delete("/:fileId", authMiddleware, deleteFile);

module.exports = router;
