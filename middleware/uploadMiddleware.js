const multer = require("multer");
const User = require("../models/User");
const { uploadToS3 } = require("../services/s3Upload");

// Define storage configuration
const storage = multer.memoryStorage();

// Define file size limits based on user plan
const getFileSizeLimit = (plan) => {
  switch (plan) {
    case "premium":
      return 100 * 1024 * 1024; // 100MB
    case "business":
      return 1024 * 1024 * 1024; // 1GB
    default:
      return 10 * 1024 * 1024; // 10MB
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit, // Default limit, overridden dynamically
}).array("files", 10); // Allow multiple files, max 10

const uploadMiddleware = [
  // Multer file upload middleware
  (req, res, next) => {
    upload(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: err.message });
      }

      console.log("Files uploaded:", req.files);

      try {
        // Upload files to S3
        const uploadResults = await Promise.all(
          req.files.map(async (file) => {
            return await uploadToS3(file);
          })
        );

        // Attach upload results to the request object
        req.uploadResults = uploadResults;
        next();
      } catch (error) {
        console.error("S3 upload error:", error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  // Check storage limit after files are uploaded
  async (req, res, next) => {
    console.log("The files", req.files);

    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Calculate total size of uploaded files
      const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);

      console.log("Total size:", totalSize);

      // Prevent upload if storage exceeds limit
      if (user.totalStorageUsed + totalSize > user.totalStorageLimit) {
        return res.status(403).json({
          message: "Storage limit exceeded. Upgrade plan to increase storage.",
        });
      }

      req.userDetails = user;
      next();
    } catch (error) {
      console.error("Storage limit check error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
];

module.exports = uploadMiddleware;
