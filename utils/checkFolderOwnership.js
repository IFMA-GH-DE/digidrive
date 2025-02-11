const Folder = require("../models/Folder");
/* const File = require("../models/File");
const User = require("../models/User"); // controllers/fileController.js
const mongoose = require("mongoose") */ const checkFolderOwnership = async (
  folderIds,
  userId
) => {
  const folders = await Folder.find({ _id: { $in: folderIds } });

  if (folders.length !== folderIds.length) {
    throw new Error("Some folders were not found.");
  }

  const unauthorizedFolders = folders.filter(
    (folder) => folder.ownerId.toString() !== userId.toString()
  );

  if (unauthorizedFolders.length > 0) {
    throw new Error("Unauthorized: Some folders do not belong to the user.");
  }
};

module.exports = checkFolderOwnership;
