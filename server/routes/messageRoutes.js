// routes/messageRoutes.js
const express = require("express");
const { createMessage, getMessages, deleteMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All message routes are protected
router.post("/", protect, createMessage);      // POST /api/messages
router.get("/", protect, getMessages);        // GET  /api/messages
router.delete("/:id", protect, deleteMessage); // DELETE /api/messages/:id (admin only)

module.exports = router;
