// controllers/shareController.js
const SharedLink = require("../models/SharedLink");

exports.createShareLink = async (req, res) => {
  try {
    const { fileId, sharedBy, expiresAt, accessType } = req.body;
    const sharedLink = new SharedLink({
      fileId,
      sharedBy,
      expiresAt,
      accessType,
    });
    await sharedLink.save();
    res.status(201).json({ message: "File shared successfully", sharedLink });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSharedLinks = async (req, res) => {
  try {
    const sharedLinks = await SharedLink.find({ sharedBy: req.user.userId });
    res.json(sharedLinks);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
