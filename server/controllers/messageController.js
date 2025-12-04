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

// @route DELETE /api/messages/:id
// @desc  Soft delete a message
// @access Private (admin only, or teacher+admin if you want)
const deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only admin (or teacher + admin) can delete
    if (req.user.role !== "admin") {
      // if you want teachers also:
      // if (req.user.role !== "admin" && req.user.role !== "teacher") { ... }
      return res.status(403).json({ message: "Not allowed to delete messages" });
    }

    // ✅ Soft delete: mark as deleted instead of removing
    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.deletedBy = req.user.role; // "admin" (or "teacher" if you allow)
    msg.reactions = []; // Clear reactions when message is deleted
    // Clear pin information when a message is deleted
    msg.isPinned = false;
    msg.pinnedAt = null;
    msg.pinnedBy = null;

    await msg.save();

    // ✅ Broadcast to all connected clients via socket
    const io = req.app.get("io");
    if (io) {
      io.to("superpaac-group").emit("messageSoftDeleted", msg._id.toString());
    }

    return res.status(200).json({
      message: "Message removed by admin",
      id: msg._id,
    });
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
