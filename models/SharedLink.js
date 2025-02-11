const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    expiresAt: { type: Date, required: false }, // Optional expiration
    accessType: {
      type: String,
      enum: ["read-only", "editable"],
      required: true,
    },
    passwordProtection: { type: String, required: false }, // Hashed password
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    accessLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        accessedAt: { type: Date, default: Date.now },
        ipAddress: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving (if password is set)
SharedLinkSchema.pre("save", async function (next) {
  if (this.passwordProtection && this.isModified("passwordProtection")) {
    this.passwordProtection = await bcrypt.hash(this.passwordProtection, 10);
  }
  next();
});

module.exports = mongoose.model("SharedLink", SharedLinkSchema);
