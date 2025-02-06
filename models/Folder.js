const mongoose = require("mongoose");

const FolderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false }, // Optional description
    size: { type: Number, default: 0 },
    fileCount: { type: Number, default: 0 },

    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Tags now support categories
    tags: [
      {
        name: { type: String, required: false },
        type: {
          type: String,
          enum: ["priority", "department", "project", "custom"],
          required: false,
        },
        value: { type: String, required: false }, // Example: "HR", "Marketing", "Q1 Reports"
      },
    ],

    // Smart Folder Functionality
    isSmartFolder: { type: Boolean, default: false },
    smartFolderRules: {
      fileType: { type: String, required: false }, // Example: pdf, docx, images
      tags: { type: [String], required: false }, // Example: ["urgent", "confidential"]
      sizeLimit: { type: Number, required: false }, // Max file size in MB
      createdBetween: {
        from: { type: Date, required: false },
        to: { type: Date, required: false },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Folder", FolderSchema);
