// controllers/folderController.js
const Folder = require("../models/Folder");
const File = require("../models/File");

exports.createFolder = async (req, res) => {
  console.log("FromCreateFolder", req.body);
  try {
    const { name, parentFolderId, tags, description } = req.body;
    const folder = new Folder({
      name,
      description: description || "", // Ensure description is valid
      parentFolderId: parentFolderId || null, // Default to null
      ownerId: req.user.userId, // Extracted from JWT
      tags: tags || [], // Default empty array
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

exports.getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ ownerId: req.user.userId });
    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
