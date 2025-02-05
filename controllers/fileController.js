const File = require("../models/File");
const User = require("../models/User"); // controllers/fileController.js
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.development" });
const { uploadToS3, deleteFromS3 } = require("../services/s3Upload");
const { generateSignedUrl } = require("../services/s3SignedUrl");
const predefinedTags = require("../constants/predefinedTags");

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
          /*  const fileKey = file.filePath.replace(
            "https://digidrive-start.s3.eu-central-1.amazonaws.com/",
            ""
          ); */

          console.log(`Generating signed URL for file: ${file.filePath}`);

          // Generate the signed URL
          const signedUrl = await generateSignedUrl(file.filePath);

          console.log("signedUrl getFiles", signedUrl);

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

    console.log("s3DELETE:", deleteFromS3Results);

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

//Update File/s feeds actions in frontend
const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    let { filename, tags, folderId, priority } = req.body;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required." });
    }

    const updateFields = {};

    // ✅ Update filename and Folder if provided
    if (filename) updateFields.filename = filename;
    if (folderId) updateFields.folderId = folderId;

    // ✅ update tags if provided
    if (tags) {
      console.log("TagsJson", tags);
      try {
        tags = JSON.parse(tags);
      } catch (error) {
        return res.status(400).json({ message: "Invalid tags format" });
      }

      // ✅ Validate tag types before saving
      tags = tags.map((tag) => {
        console.log("Tag afterJson", tag);
        return {
          name: tag.name.trim(),
          type: predefinedTags.includes(tag.name) ? tag.name : "custom", // ✅ Enforce correct tag type
        };
      });

      updateFields.tags = tags;
    }

    // ✅ Ensure priority is saved as a tag
    if (priority) {
      if (priority < 1 || priority > 5) {
        return res
          .status(400)
          .json({ message: "Priority must be between 1 and 5." });
      }

      const priorityTag = {
        name: "Priority",
        type: "priority",
        value: String(priority),
      };

      // Remove old priority tag if it exists
      updateFields.tags =
        updateFields.tags?.filter((tag) => tag.type !== "priority") || [];
      updateFields.tags.push(priorityTag);
    }

    console.log("Updating File with Fields:", updateFields);

    // ✅ Perform the update
    const updatedFile = await File.findByIdAndUpdate(fileId, updateFields, {
      new: true,
    });

    if (!updatedFile) {
      return res.status(404).json({ message: "File not found." });
    }

    res
      .status(200)
      .json({ message: "File updated successfully", file: updatedFile });
  } catch (error) {
    console.error("Error updating file:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Link files, also serves actions in frontend

// Link files
const linkFiles = async (req, res) => {
  try {
    let { fileId, relatedFiles } = req.body;

    console.log("Received Data:", req.body);

    // ✅ Validate `fileId` & `relatedFiles`
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res
        .status(400)
        .json({ message: `Invalid fileId format: ${fileId}` });
    }

    if (!Array.isArray(relatedFiles) || relatedFiles.length === 0) {
      return res.status(400).json({ message: "Invalid relatedFiles data" });
    }

    // ✅ Convert fileId & relatedFiles to ObjectId format
    fileId = new mongoose.Types.ObjectId(fileId);
    relatedFiles = relatedFiles.map((id) => new mongoose.Types.ObjectId(id));

    console.log("Processing fileId:", fileId, "Related Files:", relatedFiles);

    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      { $addToSet: { relatedFiles: { $each: relatedFiles } } }, // ✅ Ensure correct format
      { new: true }
    );

    if (!updatedFile) {
      return res.status(404).json({ message: "File not found" });
    }

    res
      .status(200)
      .json({ message: "Files linked successfully", file: updatedFile });
  } catch (error) {
    console.error("Error linking files:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
