// controllers/folderController.js
const Folder = require("../models/Folder");
const File = require("../models/File");
const predefinedTags = require("../constants/predefinedTags");

//*******************************************/ Create Folder/********************************************//✅
exports.createFolder = async (req, res) => {
  console.log("FromCreateFolder", req.body);
  try {
    const { name, parentFolderId, tags, description } = req.body;
    const folder = new Folder({
      name,
      description: description || "", // Ensure description is valid
      parentFolderId: parentFolderId || null, // Default to null
      ownerId: req.user.userId, // Extracted from JWT
      tags: tags || [],
      size: 0, // Default empty array
    });

    const savedFolder = await folder.save();

    console.log("Folder saved successfully:", savedFolder);

    res.status(201).json({
      message: "Folder created successfully",
      folder: {
        _id: savedFolder._id,
        name: savedFolder.name,
        description: savedFolder.description || "No description",
        size: 0, // Placeholder
        filesCount: 0, // Placeholder
      },
    });
  } catch (error) {
    console.error("Error saving folder:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//Create Smart Folder
exports.createSmartFolder = async (req, res) => {
  try {
    const { name, ownerId, rules } = req.body;

    const smartFolder = new Folder({
      name,
      ownerId,
      isSmartFolder: true,
      smartFolderRules: rules,
    });

    await smartFolder.save();
    res
      .status(201)
      .json({ message: "Smart Folder created", folder: smartFolder });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

//************************************************Make Folder SMart******************************************************//✅
exports.makeSmartFolder = async (req, res) => {
  try {
    const { folderId, rules } = req.body;
    console.log("smartFolderhit:", folderId);

    // Validate Folder ID
    if (!folderId) {
      return res.status(400).json({ message: "Folder ID is required." });
    }

    // Validate if folder exists
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found." });
    }

    // Update folder to be a Smart Folder
    folder.isSmartFolder = true;
    folder.smartFolderRules = rules || {};

    // Save the updated folder
    const updatedFolder = await folder.save();

    console.log("smartFolderhit:", updatedFolder);

    res.status(200).json({
      message: "Folder converted to Smart Folder successfully.",
      folder: updatedFolder,
    });
  } catch (error) {
    console.error("Error converting folder to Smart Folder:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//************************************************/Get Smart Folder Files/*************************************//✅
exports.getSmartFolderFiles = async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId);

    if (!folder || !folder.isSmartFolder) {
      return res.status(404).json({ message: "Smart folder not found" });
    }

    // Build search query dynamically
    const query = {};
    folder.smartFolderRules.forEach((value, key) => {
      query[key] = value;
    });

    const files = await File.find(query);
    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

//**************************************************Get Folders*******************************************//✅
exports.getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ ownerId: req.user.userId });
    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//**************************************************TagFolders*******************************************//✅
exports.tagFolders = async (req, res) => {
  try {
    let { folderIds, tags, priority } = req.body;

    console.log(
      "Tagging folders:",
      folderIds,
      "with tags:",
      tags,
      "Priority:",
      priority
    );

    if (!folderIds || (Array.isArray(folderIds) && folderIds.length === 0)) {
      return res.status(400).json({ message: "No folders selected" });
    }

    // Convert single folderId to an array for consistency
    if (!Array.isArray(folderIds)) {
      folderIds = [folderIds];
    }

    let updateFields = {};

    // ✅ Process tags
    if (tags) {
      try {
        tags = typeof tags === "string" ? JSON.parse(tags) : tags;
      } catch (error) {
        return res.status(400).json({ message: "Invalid tags format" });
      }

      console.log("Tags after JSON parse:", tags);

      // ✅ Validate and categorize tags
      tags = tags.map((tag) => ({
        name: tag.name.trim(),
        type: predefinedTags.includes(tag.name) ? tag.name : "custom", // ✅ Check predefined
      }));

      updateFields.tags = tags;
    }

    // ✅ Handle priority as a tag
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

    console.log("Updating Folders with Fields:", updateFields);

    // ✅ Update all selected folders
    const updatedFolders = await Folder.updateMany(
      { _id: { $in: folderIds } },
      { $set: updateFields },
      { new: true }
    );

    console.log("Updated Folders:", updatedFolders);

    // Fetch updated folders
    const modifiedFolders = await Folder.find({ _id: { $in: folderIds } });

    console.log("Updated Folders:", modifiedFolders);

    res.status(200).json({
      message: "Tags applied successfully",
      folders: modifiedFolders, // ✅ Return updated folders
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//**************************************************TagFolders*******************************************//✅

exports.moveFolders = async (req, res) => {
  try {
    const { folderId, newParentFolderId } = req.body;

    console.log("Incoming Request Body:", req.body);
    console.log(
      "Moving Folder:",
      folderId,
      "to Parent Folder:",
      newParentFolderId
    );

    // ✅ Ensure folderId is received correctly
    if (!folderId) {
      return res.status(400).json({ message: "Missing folderId in request" });
    }

    if (!newParentFolderId) {
      return res
        .status(400)
        .json({ message: "Missing newParentFolderId in request" });
    }

    // ✅ Prevent folder from moving into itself
    if (folderId === newParentFolderId) {
      return res
        .status(400)
        .json({ message: "A folder cannot be moved into itself." });
    }

    // ✅ Ensure newParentFolderId exists
    const parentFolder = await Folder.findById(newParentFolderId);
    if (!parentFolder) {
      return res
        .status(404)
        .json({ message: "Target parent folder not found" });
    }

    // ✅ Move the folder
    const updatedFolder = await Folder.findByIdAndUpdate(
      folderId,
      { parentFolderId: newParentFolderId },
      { new: true }
    );

    if (!updatedFolder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    console.log("Moved Folder:", updatedFolder);

    res.status(200).json({
      message: "Folder moved successfully",
      folder: updatedFolder, // ✅ Return updated folder
    });
  } catch (error) {
    console.error("Error moving folder:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
