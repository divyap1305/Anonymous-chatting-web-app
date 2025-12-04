// routes/messageRoutes.js
const express = require("express");
const { createMessage, getMessages, deleteMessage } = require("../controllers/messageController");
const { upload, uploadAndSendMessage } = require("../controllers/uploadController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.log('Upload error caught:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum 5 files allowed.' });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected field name for file upload.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  next();
};

// All message routes are protected
router.post("/", protect, createMessage);      // POST /api/messages
router.post("/upload", protect, upload.array("files", 5), handleMulterError, uploadAndSendMessage); // POST /api/messages/upload
router.get("/", protect, getMessages);        // GET  /api/messages
router.delete("/:id", protect, deleteMessage); // DELETE /api/messages/:id (admin only)

module.exports = router;
