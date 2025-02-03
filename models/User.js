// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    subscriptionPlan: {
      type: String,
      enum: ["free", "premium", "business"],
      default: "free",
    },
    totalStorageUsed: { type: Number, default: 0 },
    totalStorageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // Default 5GB for free users
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

module.exports = mongoose.model("User", UserSchema);
