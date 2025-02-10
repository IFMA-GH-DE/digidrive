const File = require("../models/File");
const Folder = require("../models/Folder");

const updateFolderMetadata = async (folderId) => {
  if (!folderId) return;

  console.log(`🔄 Updating metadata for folder: ${folderId}`);

  const filesInFolder = await File.find({ folderId });

  const totalSize = filesInFolder.reduce((sum, file) => sum + file.fileSize, 0);
  const fileCount = filesInFolder.length;

  console.log(`📊 New metadata - Size: ${totalSize}, Files: ${fileCount}`);

  await Folder.findByIdAndUpdate(folderId, {
    size: totalSize,
    fileCount,
  });

  console.log(`✅ Folder metadata updated for: ${folderId}`);
};

module.exports = { updateFolderMetadata };
