const SharedLink = require("../models/SharedLink");
const File = require("../models/File");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

//**************************************Create Share Link***********************************************//✅
exports.createShareLink = async (req, res) => {
  try {
    const { fileIds, expiresAt, accessType, passwordProtection, visibility } =
      req.body;
    const userId = req.user._id; // Ensure authenticated user

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: "Invalid file selection" });
    }

    let shareLinks = [];

    // ✅ Process multiple files
    for (const fileId of fileIds) {
      const file = await File.findOne({ _id: fileId, ownerId: userId });
      if (!file) {
        console.warn(`Skipping unauthorized file: ${fileId}`);
        continue; // Skip unauthorized files
      }

      // ✅ Generate a unique share token
      const shareToken = crypto.randomBytes(12).toString("hex");
      const sharedLink = new SharedLink({
        fileId,
        sharedBy: userId,
        expiresAt,
        accessType,
        visibility,
        passwordProtection: passwordProtection
          ? await bcrypt.hash(passwordProtection, 10)
          : null,
        _id: shareToken, // Use share token as ID
      });

      await sharedLink.save();
      shareLinks.push({ fileId, shareUrl: `/share/${shareToken}` });
    }

    if (shareLinks.length === 0) {
      return res
        .status(403)
        .json({ message: "No files were authorized for sharing" });
    }

    res.status(201).json({
      message: "Files shared successfully",
      shareLinks,
    });
  } catch (error) {
    console.error("Error creating share links:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//**************************************Get single shared File***********************************************//✅
exports.getSharedFile = async (req, res) => {
  try {
    const { shareToken } = req.params;
    const sharedLink = await SharedLink.findById(shareToken).populate("fileId");

    if (!sharedLink)
      return res.status(404).json({ message: "Shared link not found" });

    // ✅ Check expiration
    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      return res.status(403).json({ message: "This share link has expired" });
    }

    // ✅ Check password if required
    if (sharedLink.passwordProtection) {
      const { password } = req.body;
      if (!password)
        return res.status(401).json({ message: "Password required" });

      const isMatch = await bcrypt.compare(
        password,
        sharedLink.passwordProtection
      );
      if (!isMatch)
        return res.status(401).json({ message: "Invalid password" });
    }

    // ✅ Log access
    sharedLink.accessLog.push({
      userId: req.user?._id || null,
      ipAddress: req.ip,
    });
    await sharedLink.save();

    res.json({ file: sharedLink.fileId, accessType: sharedLink.accessType });
  } catch (error) {
    console.error("Error fetching shared file:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//**************************************Get all sharedLinks***********************************************//✅
exports.getSharedLinks = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log("Links sharedLinks for ", userId);

    // ✅ Fetch all shared links where user is the sender (Outgoing)
    const outgoingLinks = await SharedLink.find({ sharedBy: userId })
      .populate("fileId", "name size")
      .lean();

    console.log("OutgoingLinks ", outgoingLinks);

    // ✅ Fetch all shared links where user is the receiver (Incoming)
    const incomingLinks = await SharedLink.find({ "accessLog.userId": userId })
      .populate("fileId", "name size")
      .lean();

    console.log("incomingLinks ", incomingLinks);

    res.json({
      outgoing: outgoingLinks,
      incoming: incomingLinks,
    });
  } catch (error) {
    console.error("Error fetching shared links:", error);
    res.status(500).json({ message: "Server error" });
  }
};
