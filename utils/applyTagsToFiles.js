const File = require("../models/File");
//const User = require("../models/User"); // controllers/fileController.js
const Folder = require("../models/Folder");
//const mongoose = require("mongoose");

const applyTagsToFiles = async (files, tags) => {
  try {
    if (!files || files.length === 0) return;

    const fileIds = files.map((file) => file._id);

    // ✅ Ensure tags are parsed correctly
    const parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags || "[]");

    if (parsedTags.length === 0) {
      console.log("No tags provided for files.");
      return;
    }

    // ✅ Remove duplicate tag names
    const uniqueTags = [];
    const seenTagNames = new Set();

    parsedTags.forEach((tag) => {
      if (!seenTagNames.has(tag.name)) {
        uniqueTags.push(tag);
        seenTagNames.add(tag.name);
      }
    });

    console.log(
      `Applying unique tags: ${JSON.stringify(uniqueTags)} to files: ${fileIds}`
    );

    // ✅ Update files with unique tags
    await File.updateMany(
      { _id: { $in: fileIds } },
      { $set: { tags: uniqueTags } }
    );

    console.log(`✅ Successfully applied unique tags to files.`);
  } catch (error) {
    console.error("Error applying tags to files:", error);
  }
};

module.exports = applyTagsToFiles;
