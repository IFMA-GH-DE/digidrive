const File = require("../models/File");
//const User = require("../models/User"); // controllers/fileController.js
const Folder = require("../models/Folder");
//const mongoose = require("mongoose");

const applyTagsToFiles = async (fileIds, tags) => {
  try {
    // Ensure fileIds is an array
    if (!Array.isArray(fileIds)) {
      fileIds = [fileIds];
    }

    console.log("Applying Tags To Files:", fileIds, "Tags:", tags);

    if (!tags || tags.length === 0) {
      return console.log("No tags");
    }

    // 🔹 Ensure tags are in correct format
    let parsedTags;
    try {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
    } catch (error) {
      console.error("Invalid JSON format for tags:", tags);
      throw new Error("Invalid tags format. Ensure it's valid JSON.");
    }

    if (!Array.isArray(parsedTags)) {
      throw new Error("Tags must be an array.");
    }

    // 🔹 Validate tag properties
    parsedTags = parsedTags.map((tag) => ({
      name: tag.name.trim(),
      type: tag.type || "custom", // If type is missing, default to 'custom'
    }));

    // ✅ Apply tags to all selected files
    await File.updateMany(
      { _id: { $in: fileIds } },
      { $set: { tags: parsedTags } }
    );

    console.log("✅ Tags successfully applied.");
    return { success: true };
  } catch (error) {
    console.error("Error applying tags to files:", error);
    throw new Error(error.message);
  }
};

module.exports = applyTagsToFiles;
