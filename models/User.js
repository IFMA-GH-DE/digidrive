const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
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
    accountType: {
      type: String,
      enum: ["individual", "company"],
      default: "individual",
    },
    address: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },

    // Company Info (only for business accounts)
    companyName: { type: String, default: null },
    companyAddress: { type: String, default: null },
    companyContact: { type: String, default: null },
    companyTaxID: { type: String, default: null },

    // Storage
    totalStorageUsed: { type: Number, default: 0 },
    totalStorageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB default
    storageUnit: { type: String, enum: ["MB", "GB", "TB"], default: "GB" },

    // Payment Methods
    paymentMethod: {
      type: String,
      enum: ["credit_card", "paypal", "crypto", "bank_transfer", "Momo"],
      default: "credit_card",
    },
    paymentInfo: {
      cardNumber: { type: String, default: null },
      expiryDate: { type: String, default: null },
      cvv: { type: String, default: null },
    },
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
