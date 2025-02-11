const { updateFolderMetadata } = require("../utils/updateFolderMetadata");
const Folder = require("../models/Folder");
const File = require("../models/File");
const MIME_TYPE_MAP = require("../constants/mimeTypes");
const FILE_CATEGORY_MAP = require("../constants/fileCategories");

// ✅ MIME Type to Common Extension Mapping
/* const MIME_TYPE_MAP = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "text/plain": "txt",
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
};
 */
const assignFilesToFolders = async (files) => {
  try {
    console.log(
      "🏷️ Running Folder Assignment for uploaded files...",
      FILE_CATEGORY_MAP
    );
    console.log("......", MIME_TYPE_MAP);

    for (const file of files) {
      const userId = file.ownerId;

      // ✅ 1. Regular Folder Assignment (User-selected folders)
      if (file.folderId) {
        console.log(
          `📂 File "${file.filename}" manually assigned to folder: ${file.folderId}`
        );
        await updateFolderMetadata(file.folderId);
        continue;
      }

      console.log(`🔍 Checking Smart Folders for file: ${file.filename}`);

      const smartFolders = await Folder.find({
        isSmartFolder: true,
        ownerId: userId,
      });

      let bestMatch = null;

      for (const folder of smartFolders) {
        const { fileType, tags, sizeLimit, createdBetween } =
          folder.smartFolderRules;
        let matchesAllConditions = true;
        let reasonSkipped = [];

        // ✅ Extract Expected File Extension
        const fileExtension =
          MIME_TYPE_MAP[file.fileType] ||
          file.filename.split(".").pop().toLowerCase();

        // ✅ Convert File Type to Category (e.g., `xlsx` → `document`)
        let fileCategories = [];
        for (const category in FILE_CATEGORY_MAP) {
          if (FILE_CATEGORY_MAP[category].includes(fileExtension)) {
            fileCategories.push(category);
          }
        }

        // ✅Ensure all conditions are meant if provided
        if (tags && tags.length > 0) {
          const hasMatchingTag = file.tags.some((tag) =>
            tags.includes(tag.name)
          );
          if (!hasMatchingTag) {
            matchesAllConditions = false;
            reasonSkipped.push("No matching tags");
          }
        }

        // ✅ File Type must match if specified (now allowing categories)
        if (fileType && fileType.length > 0) {
          const allowedTypes = fileType
            .split(",")
            .map((t) => t.trim().toLowerCase());

          // Check if extension OR category matches
          const matchesType =
            allowedTypes.includes(fileExtension) ||
            allowedTypes.some((type) => fileCategories.includes(type));

          if (!matchesType) {
            matchesAllConditions = false;
            reasonSkipped.push(
              `File type mismatch (Expected: ${allowedTypes.join(
                ", "
              )}, Got: ${fileExtension} [Categories: ${fileCategories.join(
                ", "
              )}])`
            );
          }
        }

        // ✅ File must be within size limit
        if (sizeLimit && file.fileSize / (1024 * 1024) > sizeLimit) {
          matchesAllConditions = false;
          reasonSkipped.push("File exceeds size limit");
        }

        // ✅ File must be within created date range
        if (createdBetween?.from && createdBetween?.to) {
          const fileCreatedAt = new Date(file.createdAt);
          const fromDate = new Date(createdBetween.from);
          const toDate = new Date(createdBetween.to);
          if (!(fileCreatedAt >= fromDate && fileCreatedAt <= toDate)) {
            matchesAllConditions = false;
            reasonSkipped.push("File outside date range");
          }
        }

        // ✅ If all applicable conditions match, assign to Smart Folder
        if (matchesAllConditions) {
          bestMatch = folder;
          break;
        } else {
          console.log(
            `❌ File "${file.filename}" did NOT match "${
              folder.name
            }": ${reasonSkipped.join(", ")}`
          );
        }
      }

      // ✅ Assign to best-matching Smart Folder
      if (bestMatch) {
        console.log(
          `✅ Assigning "${file.filename}" to Smart Folder "${bestMatch.name}"`
        );
        await File.findByIdAndUpdate(file._id, { folderId: bestMatch._id });
        console.log(
          `✅ File "${file.filename}" updated with Smart Folder ID: ${bestMatch._id}`
        );
        await updateFolderMetadata(bestMatch._id);
      } else {
        console.log(
          `⚠️ No Smart Folder match found for "${file.filename}". File remains unassigned.`
        );
      }
    }

    console.log("✅ Folder Assignment Completed.");
  } catch (error) {
    console.error("❌ Error in Folder Assignment:", error);
  }
};

module.exports = { assignFilesToFolders };
