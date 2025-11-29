// controllers/messageController.js
const Message = require("../models/Message");

// @route   POST /api/messages
// @desc    Create/send a new message
// @access  Private (logged-in users only)
const createMessage = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Message text is required" });
    }

    // req.user is set by auth middleware
    const user = req.user;

    const message = await Message.create({
      text,
      sender: user._id,
      senderRole: user.role
    });

    // Populate sender basic info (but frontend will hide name for students)
    await message.populate("sender", "name email role");

    return res.status(201).json({
      message: "Message created",
      data: message
    });
  } catch (err) {
    console.error("Create message error:", err.message);
    return res.status(500).json({ message: "Server error creating message" });
  }
};

// @route   GET /api/messages
// @desc    Get all messages (for group chat)
// @access  Private
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 }) // oldest first
      .populate("sender", "name email role");

    return res.status(200).json({
      data: messages
    });
  } catch (err) {
    console.error("Get messages error:", err.message);
    return res.status(500).json({ message: "Server error fetching messages" });
  }
};

// @route   DELETE /api/messages/:id
// @desc    Delete a message (admin only)
// @access  Private + Admin
const deleteMessage = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete messages" });
    }

    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    await message.deleteOne();

    return res.status(200).json({ message: "Message deleted" });
  } catch (err) {
    console.error("Delete message error:", err.message);
    return res.status(500).json({ message: "Server error deleting message" });
  }
};

module.exports = {
  createMessage,
  getMessages,
  deleteMessage
};
