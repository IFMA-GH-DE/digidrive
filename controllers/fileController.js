const File = require("../models/File");
const User = require("../models/User"); // controllers/fileController.js
require("dotenv").config({ path: ".env.development" });
const { uploadToS3, deleteFromS3 } = require("../services/s3Upload");
const { generateSignedUrl } = require("../services/s3SignedUrl");

//Upload file
const uploadFile = async (req, res) => {
  console.log("FromUploadFile", req.files);
  try {
    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const uploadResult = await uploadToS3(file);
        const signedUrl = await generateSignedUrl(uploadResult.Key);
        console.log("signedUrl", signedUrl);

        return {
          filename: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          ownerId: req.user.userId,
          folderId: req.body.folderId || null, // Allow folder selection
          filePath: uploadResult.Key,
          signedUrl,
        };
      })
    );

    const files = await File.insertMany(uploadedFiles);
    res.status(201).json({ message: "Files uploaded successfully", files });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//Get all files
const getFiles = async (req, res) => {
  console.log("FromGetFiles", req.user.userId);

  try {
    const files = await File.find({ ownerId: req.user.userId });

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          // Extract just the file key from the full S3 URL
          const fileKey = file.filePath.replace(
            "https://digidrive-start.s3.eu-central-1.amazonaws.com/",
            ""
          );

          console.log(`Generating signed URL for file: ${fileKey}`);

          // Generate the signed URL
          const signedUrl = await generateSignedUrl(fileKey);

          return { ...file.toObject(), signedUrl };
        } catch (error) {
          console.error(
            `Error generating signed URL for ${file.filePath}:`,
            error
          );
          return { ...file.toObject(), signedUrl: null }; // Handle failures gracefully
        }
      })
    );

    res.json(filesWithUrls);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//Delete file
const deleteFile = async (req, res) => {
  console.log("FromDeleteFile", req.params);
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId);
    console.log("FoundDeleteFile", file);

    if (!file) return res.status(404).json({ message: "File not found" });

    const deleteFromS3Results = await deleteFromS3(
      file.filePath.split("/").pop()
    );

    console.log("deleteFromS3Results", deleteFromS3Results);
    const findAndDeleteResutls = await File.findByIdAndDelete(fileId);
    console.log("findAndDeleteResutls", findAndDeleteResutls);

    const user = await User.findById(file.ownerId);
    user.totalStorageUsed -= file.fileSize;
    await user.save();

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Link files
const linkFiles = async (req, res) => {
  try {
    const { fileId, relatedFileId } = req.body;

    await File.findByIdAndUpdate(fileId, {
      $addToSet: { relatedFiles: relatedFileId },
    });

    await File.findByIdAndUpdate(relatedFileId, {
      $addToSet: { relatedFiles: fileId },
    });

    res.status(200).json({ message: "Files linked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get related files
const getRelatedFiles = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId).populate("relatedFiles");

    if (!file) return res.status(404).json({ message: "File not found" });

    res.status(200).json({ relatedFiles: file.relatedFiles });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Version Control
const uploadNewVersion = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId);

    if (!file) return res.status(404).json({ message: "File not found" });

    const newVersion = {
      version: file.versions.length + 1,
      filePath: req.body.filePath,
      updatedAt: new Date(),
    };

    file.versions.push(newVersion);
    file.filePath = req.body.filePath;
    await file.save();

    res.status(200).json({ message: "New file version uploaded", file });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get all versions of a file
const getFileVersions = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId);

    if (!file) return res.status(404).json({ message: "File not found" });

    res.status(200).json({ versions: file.versions });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

//Update File
const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { filename, tags, folderId, relatedFiles } = req.body;

    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      { filename, tags, folderId, relatedFiles },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "File updated successfully", file: updatedFile });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update storage usage after file upload
const updateStorageUsage = async (req, res, next) => {
  try {
    const user = req.userDetails;
    if (!user) return res.status(404).json({ message: "User not found" });

    // Calculate total size of uploaded files
    const totalSize = req.files.reduce((acc, file) => acc + file.size, 0);

    // Update the user's storage usage
    user.totalStorageUsed += totalSize;
    await user.save();

    next();
  } catch (error) {
    console.error("Update storage usage error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  updateStorageUsage,
  getFiles,
  uploadFile,
  deleteFile,
  getRelatedFiles,
  linkFiles,
  getFileVersions,
  uploadNewVersion,
  updateFile,
}; // controllers/fileController.js
