const File = require("../models/File");
const User = require("../models/User"); // controllers/fileController.js
const Folder = require("../models/Folder");
const mongoose = require("mongoose");
const { uploadToS3, deleteFromS3 } = require("../services/s3Upload");
const { generateSignedUrl } = require("../services/s3SignedUrl");
const predefinedTags = require("../constants/predefinedTags");
const { assignFilesToFolders } = require("../services/assignFilesToFolders");
const applyTagsToFiles = require("../utils/applyTagsToFiles");
const checkFileOwnership = require("../utils/checkFileOwnership");
require("dotenv").config({ path: ".env.development" });

//**************************************Upload file***********************************************//✅

const uploadFile = async (req, res) => {
  console.log("FromUploadFile", req.files, req.user._id);

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files received" });
    }

    if (!req.user._id) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    let folderId = req.body.folderId;
    if (!folderId || folderId === "root") {
      folderId = null;
    } else if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: "Invalid folderId format" });
    }

    const uploadedFiles = [];
    const tags = req.body.tags ? JSON.parse(req.body.tags) : []; // ✅ Extract tags

    console.log("Tags", tags);

    for (const file of req.files) {
      console.log(`Processing file: ${file.originalname}`);

      if (file.size === 0) {
        console.log(`❌ Skipping empty file: ${file.originalname}`);
        continue;
      }

      const existingFile = await File.findOne({
        ownerId: req.user._id,
        filePath: file.originalname,
      });

      if (existingFile) {
        console.log(
          `Duplicate file detected: ${file.originalname}, skipping upload.`
        );
        continue;
      }

      const uploadResult = await uploadToS3(file);
      if (!uploadResult || !uploadResult.Key) {
        throw new Error(`S3 upload failed for file: ${file.originalname}`);
      }

      const signedUrl = await generateSignedUrl(uploadResult.Key);
      if (!signedUrl) {
        throw new Error(
          `Signed URL generation failed for: ${file.originalname}`
        );
      }

      uploadedFiles.push({
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        ownerId: req.user._id,
        folderId,
        filePath: uploadResult.Key,
        signedUrl,
        tags, // ✅ Ensure tags are stored
      });
    }

    if (!uploadedFiles.length) {
      throw new Error("No valid new files to insert into the database.");
    }

    console.log("Saving files to the database...");
    const files = await File.insertMany(uploadedFiles);

    console.log("Files successfully inserted into DB");

    // ✅ Apply Tags to Files
    await applyTagsToFiles(files, tags);

    // ✅ Assign to Smart Folders
    await assignFilesToFolders(files);

    res.status(201).json({ message: "Files uploaded successfully", files });
  } catch (error) {
    console.error("File Upload Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//**************************************Get all files**********************************************************//
const getFiles = async (req, res) => {
  console.log("🔍 Incoming request to getFiles...");
  console.log("🔑 Authenticated User ID:", req.user?._id || "No user ID found");

  if (!req.user?._id) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No user found in request." });
  }

  try {
    const files = await File.find({ ownerId: req.user?._id });

    console.log(`📁 Found ${files.length} files for user ${req.user?._id}`);

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          console.log(`Generating signed URL for file: ${file.filePath}`);
          const signedUrl = await generateSignedUrl(file.filePath);
          return { ...file.toObject(), signedUrl };
        } catch (error) {
          console.error(
            `Error generating signed URL for ${file.filePath}:`,
            error
          );
          return { ...file.toObject(), signedUrl: null };
        }
      })
    );

    res.json(filesWithUrls);
  } catch (error) {
    console.error("🚨 Error fetching files:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// *********************************************moveFilesToFolder***************************************************//
const moveFilesToFolder = async (req, res) => {
  try {
    const { fileIds, folderId } = req.body;

    if (!fileIds || fileIds.length === 0) {
      return res.status(400).json({ message: "No files selected" });
    }

    console.log("Moving files:", fileIds, "to folder:", folderId);

    // Update the folderId for the selected files
    await File.updateMany({ _id: { $in: fileIds } }, { folderId });

    // Fetch updated files after move
    const updatedFiles = await File.find({ _id: { $in: fileIds } });

    console.log("Updated Files:", updatedFiles);

    // Recalculate folder size and file count
    const updatedFolder = await Folder.findById(folderId);
    if (updatedFolder) {
      const filesInFolder = await File.find({ folderId });

      const totalSize = filesInFolder.reduce(
        (sum, file) => sum + file.fileSize,
        0
      );
      const fileCount = filesInFolder.length;

      await Folder.findByIdAndUpdate(folderId, { size: totalSize, fileCount });
    }

    res.status(200).json({
      message: "Files moved successfully",
      files: updatedFiles, // ✅ Return the actual moved files
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//**************************************Delete file**********************************************************//
const deleteFile = async (req, res) => {
  console.log("FromDeleteFile", req.params);
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId);
    console.log("FoundDeleteFile", file);

    if (!file) return res.status(404).json({ message: "File not found" });

    //Check if user has permissions
    if (file.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized: You do not own this file." });
    }

    // Extract the folderId from the file (if it exists)
    const folderId = file.folderId;

    // Delete file from S3
    try {
      const deleteFromS3Results = await deleteFromS3(
        file.filePath.split("/").pop()
      );
      console.log("🗑️ S3 Delete Result:", deleteFromS3Results);
    } catch (s3Error) {
      console.error("❌ S3 Deletion Failed:", s3Error);
      return res.status(500).json({ message: "Error deleting file from S3." });
    }

    // Delete file from database
    await File.findByIdAndDelete(fileId);

    // Update user storage usage
    const user = await User.findById(file.ownerId);
    if (user) {
      user.totalStorageUsed -= file.fileSize;
      await user.save();
    }

    // ✅ If file was inside a folder, update the folder size & file count
    if (folderId) {
      console.log("Updating folder:", folderId);
      const filesInFolder = await File.find({ folderId });

      const totalSize = filesInFolder.reduce(
        (sum, file) => sum + file.fileSize,
        0
      );

      const fileCount = filesInFolder.length;

      await Folder.findByIdAndUpdate(folderId, { size: totalSize, fileCount });
    }

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//**************************************Get Related files**********************************************************//
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

//**************************************Tag file**********************************************************//
const tagFiles = async (req, res) => {
  try {
    let { fileIds, tags, priority } = req.body;

    console.log(
      "Tagging files:",
      fileIds,
      "with tags:",
      tags,
      "Priority:",
      priority
    );

    if (!fileIds || (Array.isArray(fileIds) && fileIds.length === 0)) {
      return res.status(400).json({ message: "No files selected" });
    }

    // Convert single fileId to array for consistency
    if (!Array.isArray(fileIds)) {
      fileIds = [fileIds];
    }

    // ✅ Check file ownership before proceeding
    try {
      await checkFileOwnership(fileIds, req.user._id);
    } catch (ownershipError) {
      return res.status(403).json({ message: ownershipError.message });
    }

    let updateFields = {};

    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: "Tags must be an array." });
    }

    const formattedTags = tags.map((tag) => ({
      name: tag.name.trim(),
      type: predefinedTags.includes(tag.name) ? tag.name : "custom",
    }));

    console.log("Applying formatted tags:", formattedTags);

    // ✅ Update all selected files
    const updatedFiles = await File.updateMany(
      { _id: { $in: fileIds } },
      { $set: { tags: formattedTags } },
      { new: true }
    );

    console.log("Updating Files with Fields:", updateFields);

    console.log("Updated Files:", updatedFiles);

    // Fetch updated files
    const modifiedFiles = await File.find({ _id: { $in: fileIds } });
    console.log("Updated Files:", modifiedFiles);

    // ✅ Run Smart Folder assignment after every file upload
    await assignFilesToFolders(modifiedFiles);

    res.status(200).json({
      message: "Tags applied successfully",
      files: modifiedFiles, // ✅ Return updated files
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//***************************************Update File/s feeds actions in frontend**************************//
/* const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    let { filename, fileIds, tags, folderId, priority } = req.body;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required." });
    }

    if (!fileIds || fileIds.length === 0) {
      return res.status(400).json({ message: "No files selected" });
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
}; */

//*************************Link files, also serves actions in frontend***************************************//

const linkFiles = async (req, res) => {
  try {
    let { fileIds, relatedFiles, relationType } = req.body;

    console.log(
      "🔄 Processing files:",
      fileIds,
      "🔗 Linking to:",
      relatedFiles
    );

    if (!fileIds.length || !relatedFiles.length) {
      return res
        .status(400)
        .json({ message: "No files selected for linking." });
    }

    if (!["reference", "duplicate", "similar"].includes(relationType)) {
      return res.status(400).json({ message: "Invalid relation type." });
    }

    // Convert IDs to ObjectIds
    const fileObjectIds = fileIds.map((id) => new mongoose.Types.ObjectId(id));
    const relatedFileIds = relatedFiles.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Validate file ownership
    const files = await File.find({
      _id: { $in: [...fileObjectIds, ...relatedFileIds] },
    });
    if (
      !files.every(
        (file) => file.ownerId.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message: "Unauthorized: Some files do not belong to the user.",
      });
    }

    // ✅ Link selected files to multiple related files
    await File.updateMany(
      { _id: { $in: fileObjectIds } },
      {
        $addToSet: {
          relatedFiles: relatedFileIds.map((id) => ({
            fileId: id,
            relationType,
          })),
        },
      }
    );

    // ✅ Link related files back to selected files
    await File.updateMany(
      { _id: { $in: relatedFileIds } },
      {
        $addToSet: {
          relatedFiles: fileObjectIds.map((id) => ({
            fileId: id,
            relationType,
          })),
        },
      }
    );

    console.log("✅ Files successfully linked.");
    res.status(200).json({ message: "Files linked successfully." });
  } catch (error) {
    console.error("❌ Error linking files:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//**************************************Version Control**********************************************************//
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

//******************************** Get all versions of a file*********************************************//
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
  // updateFile,
  moveFilesToFolder,
  tagFiles,
}; // controllers/fileController.js
