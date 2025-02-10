const mongoose = require("mongoose");

const predefinedTags = [
  "priority",
  "department",
  "project",
  "school",
  "personal",
  "family",
  "custom",
];

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
    // ✅ Enforcing predefined & custom tags
    tags: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: predefinedTags, // ✅ Ensures type is predefined or "custom"
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

// ✅ Schema Validation: Ensure correct tag types
FileSchema.pre("save", function (next) {
  this.tags.forEach((tag) => {
    if (tag.type === "priority" && (tag.value < 1 || tag.value > 5)) {
      return next(new Error("Priority type must be between 1 and 5"));
    }
    if (predefinedTags.includes(tag.name)) {
      tag.type = tag.name; // ✅ Automatically set correct type
    } else {
      tag.type = "custom"; // ✅ Mark unrecognized tags as "custom"
    }
  });
  next();
});

module.exports = mongoose.model("File", FileSchema);
