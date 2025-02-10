const User = require("../models/User");

// Get User Details
const getUser = async (req, res) => {
  try {
    console.log("Fetching User.....");
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("The User", user);
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Details
const updateUser = async (req, res) => {
  console.log("Updating User,:", req.body);
  try {
    const user = await User.findByIdAndUpdate(req.user.userId, req.body, {
      new: true,
    });

    console.log("updated User", user);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User Update Successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getUser, updateUser };
