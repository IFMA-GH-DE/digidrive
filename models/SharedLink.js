const mongoose = require("mongoose");

const SharedLinkSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    expiresAt: { type: Date, required: false }, // Optional expiration (null = never expires)
    accessType: {
      type: String,
      enum: ["read-only", "editable"],
      required: true,
    },

    // Optional password protection
    passwordProtection: { type: String, required: false },

    // Visibility Settings
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SharedLink", SharedLinkSchema);
