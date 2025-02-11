const File = require("../models/File");
/* const User = require("../models/User"); // controllers/fileController.js
const Folder = require("../models/Folder");
const mongoose = require("mongoose"); */

const checkFileOwnership = async (fileIds, userId) => {
  const files = await File.find({ _id: { $in: fileIds } });

  if (files.length !== fileIds.length) {
    throw new Error("Some files were not found.");
  }

  const unauthorizedFiles = files.filter(
    (file) => file.ownerId.toString() !== userId.toString()
  );

  if (unauthorizedFiles.length > 0) {
    throw new Error("Unauthorized: Some files do not belong to the user.");
  }
};

module.exports = checkFileOwnership;
