const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    // Tags now allow different categories beyond priority
    tags: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ["priority", "department", "project", "custom"],
          required: true,
        },
        value: { type: String, required: false }, // Optional metadata
      },
    ],

    // File Relationships
    relatedFiles: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
        relationType: {
          type: String,
          enum: ["reference", "duplicate", "similar"],
          default: "reference",
        },
      },
    ],

    // Version Control
    versions: [
      {
        version: { type: Number, required: true },
        updatedAt: { type: Date, default: Date.now },
        uploaderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        filePath: { type: String, required: true },
        metadata: { type: Map, of: String }, // Example: { "comment": "Updated contract" }
      },
    ],

    // Smart Folder Integration
    isSmartFolder: { type: Boolean, default: false },
    smartFolderRules: {
      fileType: { type: String, required: false },
      tags: { type: [String], required: false },
      sizeLimit: { type: Number, required: false },
      createdBetween: {
        from: { type: Date, required: false },
        to: { type: Date, required: false },
      },
    },
  },
  { timestamps: true }
);

// Validate tag uniqueness and priority range
FileSchema.pre("save", function (next) {
  const uniqueTags = new Set();

  this.tags.forEach((tag) => {
    if (tag.type === "priority" && (tag.value < 1 || tag.value > 5)) {
      return next(new Error("Priority type must be between 1 and 5"));
    }
    if (uniqueTags.has(tag.name)) {
      return next(new Error("Duplicate tag names are not allowed"));
    }
    uniqueTags.add(tag.name);
  });

  next();
});

module.exports = mongoose.model("File", FileSchema);
